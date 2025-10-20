import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Detect Alpaca account type (paper vs live) using provided or env credentials
 * Returns account type and basic account info
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting account type detection...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return json({ ok: false, error: 'missing_auth_header', message: 'Authorization header required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth failed:', authError);
      return json({ ok: false, error: 'unauthorized', message: 'Invalid or expired token' }, 401);
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Create a user-scoped client so auth.uid() is set in RPC/RLS calls
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return json({ ok: false, error: 'invalid_json', message: 'Request body must be valid JSON' }, 400);
    }

    const { broker = 'alpaca', apiKey, secretKey } = body;
    
    console.log('📋 Request params:', { broker, hasApiKey: !!apiKey, hasSecretKey: !!secretKey });
    
    if (broker !== "alpaca") {
      console.error('❌ Unsupported broker:', broker);
      return json({ ok: false, error: "unsupported_broker", message: "Only Alpaca is currently supported" }, 400);
    }

    // Validate credentials
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      console.error('❌ Invalid API key');
      return json({ 
        ok: false, 
        error: "invalid_api_key",
        message: "API key is required and must be at least 10 characters"
      }, 400);
    }

    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim().length < 10) {
      console.error('❌ Invalid secret key');
      return json({ 
        ok: false, 
        error: "invalid_secret_key",
        message: "Secret key is required and must be at least 10 characters"
      }, 400);
    }

    const testApiKey = apiKey.trim();
    const testSecretKey = secretKey.trim();

    // Try paper first, then live
    console.log('🔍 Testing paper trading credentials...');
    const paperResult = await tryAlpaca("paper", testApiKey, testSecretKey);
    
    if (paperResult.ok) {
      console.log('✅ Paper trading connection successful');
      await storeConnection(supabaseUser, user.id, "alpaca", "paper", paperResult.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        accountType: "paper",
        mode: "paper",
        account: paperResult.account,
        message: "Connected to paper trading account successfully"
      });
    }

    console.log('🔍 Paper failed, testing live trading credentials...');
    const liveResult = await tryAlpaca("live", testApiKey, testSecretKey);
    
    if (liveResult.ok) {
      console.log('✅ Live trading connection successful');
      await storeConnection(supabaseUser, user.id, "alpaca", "live", liveResult.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        accountType: "live",
        mode: "live",
        account: liveResult.account,
        message: "Connected to live trading account successfully"
      });
    }

    console.error('❌ Both paper and live authentication failed');
    return json({ 
      ok: false, 
      error: "authentication_failed",
      message: "Invalid API credentials. Please check your API key and secret.",
      details: {
        paperError: paperResult.error,
        liveError: liveResult.error
      }
    }, 401);

  } catch (error) {
    console.error('💥 Unexpected error in detect-account-type:', error);
    return json({ 
      ok: false, 
      error: "server_error",
      message: (error as Error).message || 'Failed to detect account type'
    }, 500);
  }
});

async function tryAlpaca(mode: "paper" | "live", apiKey: string, secretKey: string) {
  const baseUrl = mode === "live"
    ? "https://api.alpaca.markets"
    : "https://paper-api.alpaca.markets";

  try {
    console.log(`🔌 Testing ${mode} endpoint: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ ${mode} auth failed: ${response.status} - ${errorText}`);
      return { ok: false, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}` };
    }

    const account = await response.json();
    console.log(`✅ ${mode} auth successful - Account: ${account.account_number}, Status: ${account.status}`);
    
    return { ok: true, account };
  } catch (e) {
    console.error(`❌ ${mode} connection error:`, e);
    return { ok: false, error: (e as Error).message };
  }
}

async function storeConnection(supabase: any, userId: string, broker: string, mode: string, accountInfo: any) {
  try {
    console.log('💾 Storing connection metadata...');
    
    // Ensure workspace exists
    const { data: wsId, error: wsError } = await supabase.rpc('ensure_default_workspace');
    
    if (wsError) {
      console.error('❌ Failed to get workspace:', wsError);
      throw new Error(`Workspace error: ${wsError.message}`);
    }
    
    const workspace_id = wsId as string;
    if (!workspace_id) {
      throw new Error('Workspace resolution failed: auth context missing or RPC returned null');
    }
    console.log(`📦 Workspace ID: ${workspace_id}`);
    const { error: upsertError } = await supabase.from('connections_brokerages').upsert({
      workspace_id,
      provider: broker,
      status: 'active',
      account_label: `Alpaca ${mode.charAt(0).toUpperCase() + mode.slice(1)} Account`,
      scope: { 
        account_type: mode,
        trading_permissions: accountInfo?.trading_blocked === false ? ['trading'] : [],
        account_status: accountInfo?.status || 'unknown',
        account_number: accountInfo?.account_number
      },
      last_sync: new Date().toISOString()
    }, { onConflict: 'workspace_id,provider' });

    if (upsertError) {
      console.error('❌ Failed to store connection:', upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log(`✅ Connection metadata stored successfully`);
  } catch (e) {
    console.error('💥 Error in storeConnection:', e);
    throw e;
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}