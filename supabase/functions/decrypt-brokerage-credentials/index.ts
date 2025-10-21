import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, supaFromReq } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

serve(async (req) => {
  const cors = handleCORS(req); 
  if (cors) return cors;
  
  try {
    const { broker, mode = "paper", workspaceId } = await req.json().catch(() => ({}));
    
    if (!broker) {
      return json({ ok: false, error: "missing_broker" }, 400);
    }

    if (!workspaceId) {
      return json({ ok: false, error: "missing_workspace_id" }, 400);
    }

    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('❌ CREDENTIAL_ENCRYPTION_KEY not configured');
      return json({ ok: false, error: "encryption_key_not_configured" }, 500);
    }

    console.log(`🔓 Decrypting credentials for ${broker}:${mode}`);

    // Fetch encrypted credentials from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error: dbError } = await supabase
      .from('connections_brokerages')
      .select('api_key_cipher, api_secret_cipher, nonce')
      .eq('workspace_id', workspaceId)
      .eq('provider', broker)
      .eq('mode', mode)
      .single();

    if (dbError || !data) {
      console.error('❌ Database error or no credentials found:', dbError);
      return json({ ok: false, error: "credentials_not_found" }, 404);
    }

    if (!data.api_key_cipher || !data.api_secret_cipher || !data.nonce) {
      console.error('❌ Incomplete encrypted data');
      return json({ ok: false, error: "incomplete_credentials" }, 400);
    }

    // Decode from base64
    const apiKeyCipherBytes = Uint8Array.from(atob(data.api_key_cipher), c => c.charCodeAt(0));
    const secretKeyCipherBytes = Uint8Array.from(atob(data.api_secret_cipher), c => c.charCodeAt(0));
    const nonceBytes = Uint8Array.from(atob(data.nonce), c => c.charCodeAt(0));

    // Import the decryption key
    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt API key
    const apiKeyDecrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonceBytes },
      key,
      apiKeyCipherBytes
    );

    // Decrypt secret key
    const secretKeyDecrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonceBytes },
      key,
      secretKeyCipherBytes
    );

    const apiKey = new TextDecoder().decode(apiKeyDecrypted);
    const secretKey = new TextDecoder().decode(secretKeyDecrypted);

    console.log(`✅ Credentials decrypted for ${broker}:${mode}`);

    return json({ 
      ok: true, 
      success: true,
      broker, 
      mode, 
      credentials: { 
        apiKey, 
        secretKey,
        api_key: apiKey,
        secret_key: secretKey 
      } 
    });
  } catch (e) {
    console.error('💥 Decryption error:', e);
    return json({ 
      ok: false, 
      error: "decryption_failed", 
      detail: (e as Error).message 
    }, 500);
  }
});
