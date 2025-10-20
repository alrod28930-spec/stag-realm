import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Encryption stub for development mode
 * Returns a reference indicating credentials are stored in server env
 * TODO: Migrate to Supabase Vault or KMS for production
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { broker, mode } = await req.json().catch(() => ({}));
    
    if (!broker) {
      return json({ ok: false, error: "missing_broker" }, 400);
    }

    console.log(`🔐 Dev mode: Using env-based credentials for ${broker}:${mode || 'paper'}`);

    // For dev: we DO NOT store secrets. We return a reference describing env source.
    return json({
      ok: true,
      provider: "env",
      refId: `env:${broker}:${mode ?? "paper"}`,
      note: "Dev mode: credentials are taken from server env. Upgrade to Vault later."
    });

  } catch (error) {
    console.error('Encrypt stub error:', error);
    return json({ 
      ok: false, 
      error: (error as Error).message || 'Failed to process request'
    }, 400);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}