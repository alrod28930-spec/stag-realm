import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Encrypts brokerage credentials and stores them in the database
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { broker, mode, apiKey, secretKey, workspaceId } = await req.json().catch(() => ({}));
    
    if (!broker || !apiKey || !secretKey || !workspaceId) {
      return json({ ok: false, error: "missing_parameters" }, 400);
    }

    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('❌ CREDENTIAL_ENCRYPTION_KEY not configured');
      return json({ ok: false, error: "encryption_key_not_configured" }, 500);
    }

    console.log(`🔐 Encrypting credentials for ${broker}:${mode}`);

    // Generate a random nonce for this encryption
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the encryption key
    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Encrypt API key
    const apiKeyEncrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      new TextEncoder().encode(apiKey)
    );

    // Encrypt secret key
    const secretKeyEncrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      new TextEncoder().encode(secretKey)
    );

    // Convert to base64 for storage
    const apiKeyCipher = btoa(String.fromCharCode(...new Uint8Array(apiKeyEncrypted)));
    const secretKeyCipher = btoa(String.fromCharCode(...new Uint8Array(secretKeyEncrypted)));
    const nonceB64 = btoa(String.fromCharCode(...nonce));

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('connections_brokerages')
      .update({
        api_key_cipher: apiKeyCipher,
        api_secret_cipher: secretKeyCipher,
        nonce: nonceB64,
        updated_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId)
      .eq('provider', broker)
      .eq('mode', mode);

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return json({ ok: false, error: "database_error", detail: dbError.message }, 500);
    }

    console.log(`✅ Credentials encrypted and stored for ${broker}:${mode}`);

    return json({
      ok: true,
      message: "Credentials encrypted and stored successfully"
    });

  } catch (error) {
    console.error('💥 Encryption error:', error);
    return json({ 
      ok: false, 
      error: (error as Error).message || 'Failed to encrypt credentials'
    }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}