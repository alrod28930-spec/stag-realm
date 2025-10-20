import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Credential resolver for development mode
 * Returns credentials from server environment variables
 * Supports both paper and live mode via naming convention
 * TODO: Migrate to Supabase Vault for production
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { broker, mode = "paper" } = await req.json().catch(() => ({}));
    
    if (!broker) {
      return json({ ok: false, error: "missing_broker" }, 400);
    }

    if (broker === "alpaca") {
      // Support paper/live suffix via env naming convention
      const keyVar = mode === "live" ? "ALPACA_API_KEY_LIVE" : "ALPACA_API_KEY";
      const secVar = mode === "live" ? "ALPACA_SECRET_KEY_LIVE" : "ALPACA_SECRET_KEY";
      const apiKey = Deno.env.get(keyVar);
      const secretKey = Deno.env.get(secVar);

      if (!apiKey || !secretKey) {
        console.error(`Missing credentials: ${keyVar} or ${secVar}`);
        return json({ 
          ok: false, 
          error: "missing_credentials",
          detail: `Please configure ${keyVar} and ${secVar} in Edge Function secrets`
        }, 400);
      }

      console.log(`✅ Retrieved ${broker} credentials from env (${mode} mode)`);
      
      return json({ 
        ok: true, 
        broker, 
        mode, 
        credentials: { 
          apiKey, 
          secretKey,
          api_key: apiKey,
          secret_key: secretKey
        } 
      });
    }

    return json({ ok: false, error: "unsupported_broker" }, 400);

  } catch (error) {
    console.error('Decrypt error:', error);
    return json({ 
      ok: false, 
      error: (error as Error).message || 'Failed to retrieve credentials'
    }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
