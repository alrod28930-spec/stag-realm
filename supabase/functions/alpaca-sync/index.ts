import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ensureWorkspace } from "../_shared/guards.ts";

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

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  try {
    const { workspaceId, supabase } = await ensureWorkspace(req);
    
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