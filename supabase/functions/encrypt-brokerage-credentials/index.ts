import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialRequest {
  workspace_id: string;
  provider: string;
  account_label?: string;
  api_key: string;
  api_secret: string;
  scope?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    // Verify the JWT token from the authorization header
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { workspace_id, provider, account_label, api_key, api_secret, scope }: CredentialRequest = await req.json();

    if (!workspace_id || !provider || !api_key || !api_secret) {
      throw new Error('Missing required fields');
    }

    // Generate a random key for encryption (in production, use a proper key derivation)
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Encrypt API key
    const apiKeyEncoder = new TextEncoder();
    const apiKeyData = apiKeyEncoder.encode(api_key);
    const apiKeyNonce = crypto.getRandomValues(new Uint8Array(12));
    const encryptedApiKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: apiKeyNonce },
      key,
      apiKeyData
    );

    // Encrypt secret key
    const secretData = apiKeyEncoder.encode(api_secret);
    const secretNonce = crypto.getRandomValues(new Uint8Array(12));
    const encryptedSecret = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: secretNonce },
      key,
      secretData
    );

    // For demo purposes, we'll use a simple combined nonce
    // In production, store the encryption key securely (e.g., in Vault)
    const combinedNonce = new Uint8Array([...apiKeyNonce, ...secretNonce]);

    // Store encrypted credentials in database
    const { data, error } = await supabase
      .from('connections_brokerages')
      .insert({
        workspace_id,
        provider,
        account_label,
        api_key_cipher: new Uint8Array(encryptedApiKey),
        api_secret_cipher: new Uint8Array(encryptedSecret),
        nonce: combinedNonce,
        scope,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Brokerage credentials encrypted and stored', { 
      workspace_id, 
      provider,
      connection_id: data.id 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      connection_id: data.id,
      message: 'Credentials encrypted and stored successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error encrypting credentials:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Failed to encrypt credentials'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});