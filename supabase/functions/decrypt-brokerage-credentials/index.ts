import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "decrypt-brokerage-credentials";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  let workspace_id = "";
  let supabase: any;

  try {
    const result = await ensureWorkspace(req);
    workspace_id = result.workspaceId;
    supabase = result.supabase;
    
    const body = await req.json().catch(() => ({}));
    const { broker = "alpaca", mode = "paper" } = body;
    
    console.log(`🔓 Decrypt request - workspace: ${workspace_id}, broker: ${broker}, mode: ${mode}`);

    // Fetch encrypted credentials from database
    const { data: connection, error: fetchError } = await supabase
      .from('connections_brokerages')
      .select('api_key_cipher, api_secret_cipher, nonce')
      .eq('workspace_id', workspace_id)
      .eq('provider', broker)
      .eq('mode', mode)
      .single();

    if (fetchError || !connection) {
      console.error('❌ No credentials found in database');
      
      // Fallback to env variables for development
      const apiKey = Deno.env.get("ALPACA_API_KEY");
      const secretKey = Deno.env.get("ALPACA_SECRET_KEY");
      
      if (apiKey && secretKey) {
        console.log("⚠️ Using env credentials (dev mode fallback)");
        await repoEvent(supabase, workspace_id, FN, { ok: true, mode: "env_fallback" });
        
        return json({
          ok: true,
          credentials: {
            apiKey,
            secretKey,
            api_key: apiKey,
            secret_key: secretKey
          },
          mode: "env_fallback"
        });
      }
      
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "no_credentials_found" });
      return json({ ok: false, error: "no_credentials_found" }, 404);
    }

    const { api_key_cipher, api_secret_cipher, nonce } = connection;

    if (!api_key_cipher || !api_secret_cipher || !nonce) {
      console.error('❌ Incomplete encrypted credentials');
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "incomplete_credentials" });
      return json({ ok: false, error: "incomplete_credentials" }, 400);
    }

    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('❌ CREDENTIAL_ENCRYPTION_KEY not configured');
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "encryption_key_not_configured" });
      return json({ ok: false, error: "encryption_key_not_configured" }, 500);
    }

    console.log('🔓 Decrypting credentials from database');

    // Decode base64 values
    const apiKeyCipherBytes = Uint8Array.from(atob(api_key_cipher), c => c.charCodeAt(0));
    const secretKeyCipherBytes = Uint8Array.from(atob(api_secret_cipher), c => c.charCodeAt(0));
    const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));

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

    console.log('✅ Credentials decrypted successfully');
    await repoEvent(supabase, workspace_id, FN, { ok: true, mode: "database" });
    
    return json({
      ok: true,
      credentials: {
        apiKey,
        secretKey,
        api_key: apiKey,
        secret_key: secretKey
      },
      mode: "database"
    });
  } catch (e) {
    console.error("[decrypt] Error:", e);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
