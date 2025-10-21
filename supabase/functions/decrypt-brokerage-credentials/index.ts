import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

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

function supaFromReq(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(url, anon, { global: { headers: { Authorization: auth }}});
}

async function ensureWorkspace(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  const { data, error: rpcError } = await supabase.rpc('ensure_workspace_for_user', { _user: user.id });
  if (rpcError) throw rpcError;
  return data as string;
}

serve(async (req) => {
  const cors = handleCORS(req); 
  if (cors) return cors;
  
  try {
    const body = await req.json().catch(() => ({}));
    let { broker, mode, workspaceId } = body;
    
    // If workspaceId not provided, try to get it from auth
    if (!workspaceId) {
      const supabase = supaFromReq(req);
      workspaceId = await ensureWorkspace(supabase);
    }
    
    if (!broker) broker = "alpaca";
    if (!mode) mode = "paper";
    
    console.log(`🔓 Decrypt request - workspace: ${workspaceId}, broker: ${broker}, mode: ${mode}`);

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
