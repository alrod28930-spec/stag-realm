import { serve } from "https://deno.land/std/http/server.ts";
import { supaFromReq, json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;
  
  try {
    const supabase = supaFromReq(req);
    const workspace_id = await ensureWorkspace(supabase);

    const { broker = "alpaca", apiKey, secretKey } = await req.json().catch(() => ({}));
    
    if (!apiKey || !secretKey) {
      return json({ 
        ok: false, 
        error: "missing_credentials",
        message: "API key and secret are required"
      }, 400);
    }

    console.log('🔍 Testing account credentials with provided API key...');
    
    // Try live first
    const live = await probe("live", apiKey, secretKey);
    if (live.ok) {
      await storeConnection(supabase, workspace_id, broker, "live", live.account);
      await encryptCredentials(workspace_id, broker, "live", apiKey, secretKey);
      return json({ 
        ok: true, 
        broker, 
        mode: "live",
        accountType: "live",
        account: live.account,
        message: "Connected to live trading account successfully"
      });
    }
    
    // Try paper
    const paper = await probe("paper", apiKey, secretKey);
    if (paper.ok) {
      await storeConnection(supabase, workspace_id, broker, "paper", paper.account);
      await encryptCredentials(workspace_id, broker, "paper", apiKey, secretKey);
      return json({ 
        ok: true, 
        broker, 
        mode: "paper",
        accountType: "paper",
        account: paper.account,
        message: "Connected to paper trading account successfully"
      });
    }
    
    return json({ 
      ok: false, 
      error: "authentication_failed",
      message: "Invalid API credentials for both live and paper accounts. Please check your API key and secret."
    }, 401);
  } catch (e) {
    console.error('💥 Unexpected error:', e);
    return json({ 
      ok: false, 
      error: "exception", 
      detail: (e as Error).message 
    }, 500);
  }
});

async function probe(mode: "live" | "paper", apiKey: string, secretKey: string) {
  const base = mode === "live" 
    ? "https://api.alpaca.markets" 
    : "https://paper-api.alpaca.markets";
    
  try {
    console.log(`🔍 Probing ${mode} endpoint...`);
    const r = await fetch(`${base}/v2/account`, {
      headers: { 
        "APCA-API-KEY-ID": apiKey.trim(), 
        "APCA-API-SECRET-KEY": secretKey.trim() 
      }
    });
    
    if (!r.ok) {
      console.log(`❌ ${mode} probe failed with status: ${r.status}`);
      return { ok: false, error: String(r.status) };
    }
    
    const account = await r.json();
    console.log(`✅ ${mode} probe successful, account: ${account.account_number}`);
    return { ok: true, account };
  } catch (e) {
    console.error(`💥 ${mode} probe error:`, e);
    return { ok: false, error: (e as Error).message };
  }
}

async function storeConnection(supabase: any, workspace_id: string, broker: string, mode: string, accountInfo: any) {
  try {
    console.log('💾 Storing connection metadata...');
    
    const { error: upsertError } = await supabase
      .from('connections_brokerages')
      .upsert({
        workspace_id,
        provider: broker,
        mode,
        status: 'active',
        account_label: `Alpaca ${mode.charAt(0).toUpperCase() + mode.slice(1)} Account`,
        scope: { 
          account_type: mode,
          trading_permissions: accountInfo?.trading_blocked === false ? ['trading'] : [],
          account_status: accountInfo?.status || 'unknown',
          account_number: accountInfo?.account_number
        },
        last_sync: new Date().toISOString()
      }, { onConflict: 'workspace_id,provider,mode' });

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

async function encryptCredentials(workspaceId: string, broker: string, mode: string, apiKey: string, secretKey: string) {
  try {
    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('❌ CREDENTIAL_ENCRYPTION_KEY not configured');
      return;
    }

    console.log(`🔐 Encrypting credentials for ${broker}:${mode}`);

    // Generate a random nonce
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

    // Use service role to update encrypted credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.0');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
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

    if (error) {
      console.error('❌ Failed to store encrypted credentials:', error);
    } else {
      console.log(`✅ Credentials encrypted and stored for ${broker}:${mode}`);
    }
  } catch (e) {
    console.error('💥 Error encrypting credentials:', e);
  }
}
