import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ENFORCE_SUBS = Deno.env.get("SUBSCRIPTION_ENFORCEMENT") === "true";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // Ensure user has a workspace
    const { data: wsId, error: wsErr } = await supabase.rpc('ensure_default_workspace');
    if (wsErr) {
      return json({ ok: false, error: 'workspace', detail: wsErr.message }, 500);
    }
    const workspace_id = wsId as string;

    // Check subscription if enforcement is enabled
    if (ENFORCE_SUBS) {
      // Add entitlement check here when subscriptions are re-enabled
      // const { data: sub } = await supabase
      //   .from('subscriptions')
      //   .select('plan')
      //   .eq('workspace_id', workspace_id)
      //   .single();
      // if (!sub || !['pro', 'elite'].includes(sub.plan)) {
      //   return json({ ok: false, error: 'subscription_required' }, 403);
      // }
    }

    const { broker, credentials, account_label } = await req.json();

    if (!broker || !credentials) {
      return json({ ok: false, error: 'missing_params', detail: 'broker and credentials are required' }, 400);
    }

    // Test broker connection
    const healthCheck = await testBrokerConnection(broker, credentials);
    
    // Store connection using encrypt function
    const encryptResponse = await supabase.functions.invoke('encrypt-brokerage-credentials', {
      body: {
        workspace_id,
        provider: broker,
        credentials,
        account_label: account_label || `${broker} account`
      }
    });

    if (encryptResponse.error) {
      return json({ ok: false, error: 'encryption_failed', detail: encryptResponse.error }, 500);
    }

    return json({
      ok: true,
      workspace_id,
      broker_status: healthCheck.ok ? 'ok' : 'degraded',
      connection_id: encryptResponse.data?.id,
      message: healthCheck.ok ? 'Connected successfully' : `Connected with warnings: ${healthCheck.message}`
    });

  } catch (e) {
    return json({ ok: false, error: 'exception', detail: (e as Error).message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function testBrokerConnection(broker: string, credentials: any) {
  try {
    if (broker.toLowerCase() === 'alpaca') {
      const baseUrl = credentials.is_live ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
      const response = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': credentials.api_key || credentials.apiKey,
          'APCA-API-SECRET-KEY': credentials.api_secret || credentials.apiSecret || credentials.secret_key,
        },
      });

      if (!response.ok) {
        return { ok: false, message: `Alpaca API error: ${response.status}` };
      }

      const account = await response.json();
      return { ok: true, account_id: account.account_number };
    }

    // Add other broker tests here
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
