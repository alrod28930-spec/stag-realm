import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function handleCORS(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return null;
}

function supaFromReq(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function ensureWorkspace(supabase: any, req: Request) {
  try {
    // Extract JWT token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No Authorization header');
      throw new Error('Unauthorized: No Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify user with explicit token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('❌ Auth failed:', error?.message);
      throw new Error(`Unauthorized: ${error?.message || 'No user session'}`);
    }
    
    console.log('✅ User authenticated:', user.email);
    
    const { data: wsData, error: rpcError } = await supabase.rpc('ensure_default_workspace');
    if (rpcError) {
      console.error('❌ RPC failed:', rpcError);
      throw new Error(`Workspace error: ${rpcError.message}`);
    }
    
    if (!wsData) throw new Error('No workspace returned');
    console.log('✅ Workspace:', wsData);
    return wsData as string;
  } catch (e) {
    console.error('❌ ensureWorkspace failed:', e);
    throw e;
  }
}

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  try {
    const supabase = supaFromReq(req);
    const workspaceId = await ensureWorkspace(supabase, req);
    
    console.log(`✅ Resolved workspace: ${workspaceId}`);

    // Get the broker and mode from request body (default to alpaca:paper)
    const body = await req.json().catch(() => ({}));
    const broker = body.broker || 'alpaca';
    const mode = body.mode || 'paper';

    console.log(`🔓 Fetching credentials for ${broker}:${mode}`);

    // Call centralized decrypt function
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke(
      'decrypt-brokerage-credentials',
      {
        body: { broker, mode }
      }
    );

    if (decryptError || !decryptData?.ok) {
      throw new Error('Failed to decrypt credentials: ' + (decryptData?.error || decryptError?.message));
    }

    const alpacaApiKey = decryptData.credentials.apiKey;
    const alpacaSecretKey = decryptData.credentials.secretKey;

    console.log(`✅ Credentials retrieved successfully (mode: ${decryptData.mode})`);

    // Detect correct Alpaca base URL (paper vs live)
    let baseUrl = 'https://paper-api.alpaca.markets';
    try {
      const testPaper = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': alpacaApiKey,
          'APCA-API-SECRET-KEY': alpacaSecretKey,
        },
      });
      if (!testPaper.ok) {
        const liveUrl = 'https://api.alpaca.markets';
        const testLive = await fetch(`${liveUrl}/v2/account`, {
          headers: {
            'APCA-API-KEY-ID': alpacaApiKey,
            'APCA-API-SECRET-KEY': alpacaSecretKey,
          },
        });
        if (testLive.ok) baseUrl = liveUrl;
      }
    } catch (_) {}

    // Fetch Alpaca account info
    const accountResponse = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
      },
    });

    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch Alpaca account: ${accountResponse.status}`);
    }

    const account = await accountResponse.json();

    // Fetch Alpaca positions
    const positionsResponse = await fetch(`${baseUrl}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
      },
    });

    if (!positionsResponse.ok) {
      throw new Error(`Failed to fetch Alpaca positions: ${positionsResponse.status}`);
    }

    const alpacaPositions = await positionsResponse.json();

    // Update or insert portfolio summary
    const { error: portfolioError } = await supabase
      .from('portfolio_current')
      .upsert({
        workspace_id: workspaceId,
        cash: parseFloat(account.cash),
        equity: parseFloat(account.equity),
        updated_at: new Date().toISOString()
      });

    if (portfolioError) throw portfolioError;

    // Clear existing positions for this workspace
    const { error: clearError } = await supabase
      .from('positions_current')
      .delete()
      .eq('workspace_id', workspaceId);

    if (clearError) throw clearError;

    // Insert current positions
    if (alpacaPositions.length > 0) {
      const positionsToInsert = alpacaPositions.map((pos: any) => ({
        workspace_id: workspaceId,
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        avg_cost: parseFloat(pos.avg_cost || pos.cost_basis),
        mv: parseFloat(pos.market_value),
        unr_pnl: parseFloat(pos.unrealized_pl),
        r_pnl: parseFloat(pos.realized_pl || '0'),
        updated_at: new Date().toISOString()
      }));

      const { error: positionsError } = await supabase
        .from('positions_current')
        .insert(positionsToInsert);

      if (positionsError) throw positionsError;
    }

    return json({
      success: true,
      message: 'Portfolio synced successfully',
      data: {
        equity: parseFloat(account.equity),
        cash: parseFloat(account.cash),
        positions_count: alpacaPositions.length
      }
    });

  } catch (error) {
    console.error('Alpaca sync error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync with Alpaca'
    }, 500);
  }
});