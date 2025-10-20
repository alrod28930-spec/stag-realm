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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const { broker = 'alpaca', apiKey, secretKey } = await req.json().catch(() => ({}));
    
    if (broker !== "alpaca") {
      return json({ ok: false, error: "unsupported_broker" }, 400);
    }

    // Use provided credentials or fall back to env
    const testApiKey = apiKey || Deno.env.get('ALPACA_API_KEY');
    const testSecretKey = secretKey || Deno.env.get('ALPACA_SECRET_KEY');

    if (!testApiKey || !testSecretKey) {
      return json({ 
        ok: false, 
        error: "missing_credentials",
        message: "Please provide apiKey and secretKey or configure ALPACA_API_KEY/ALPACA_SECRET_KEY"
      }, 400);
    }

    // Try paper first, then live
    const paperResult = await tryAlpaca("paper", testApiKey, testSecretKey);
    if (paperResult.ok) {
      // Store connection metadata
      await storeConnection(supabase, user.id, "alpaca", "paper", paperResult.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        accountType: "paper",
        mode: "paper",
        account: paperResult.account,
        message: "Connected to paper trading account successfully"
      });
    }

    const liveResult = await tryAlpaca("live", testApiKey, testSecretKey);
    if (liveResult.ok) {
      // Store connection metadata
      await storeConnection(supabase, user.id, "alpaca", "live", liveResult.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        accountType: "live",
        mode: "live",
        account: liveResult.account,
        message: "Connected to live trading account successfully"
      });
    }

    return json({ 
      ok: false, 
      error: "auth_failed",
      message: "Could not authenticate with either paper or live trading endpoints"
    }, 401);

  } catch (error) {
    console.error('Account type detection error:', error);
    return json({ 
      ok: false, 
      error: (error as Error).message || 'Failed to detect account type'
    }, 500);
  }
});

async function tryAlpaca(mode: "paper" | "live", apiKey: string, secretKey: string) {
  const baseUrl = mode === "live"
    ? "https://api.alpaca.markets"
    : "https://paper-api.alpaca.markets";

  try {
    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey
      }
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const account = await response.json();
    console.log(`✅ Successfully authenticated with Alpaca ${mode} account`);
    
    return { ok: true, account };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function storeConnection(supabase: any, userId: string, broker: string, mode: string, accountInfo: any) {
  // Ensure workspace exists
  const { data: wsId } = await supabase.rpc('ensure_default_workspace');
  const workspace_id = wsId as string;

  // Store connection metadata (not actual credentials)
  await supabase.from('connections_brokerages').upsert({
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

  console.log(`💾 Stored connection metadata for workspace ${workspace_id}`);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}