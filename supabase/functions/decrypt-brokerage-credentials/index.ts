import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecryptRequest {
  connection_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for decryption
      {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { connection_id }: DecryptRequest = await req.json();

    if (!connection_id) {
      throw new Error('Missing connection ID');
    }

    // Fetch encrypted credentials
    const { data: connection, error } = await supabase
      .from('connections_brokerages')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (error || !connection) {
      throw new Error('Connection not found');
    }

    // IMPORTANT: In production, this function should only be called from 
    // other edge functions for broker API calls, never directly from client
    console.warn('SECURITY: Decryption requested for connection', { 
      connection_id,
      provider: connection.provider 
    });

    // For demo purposes, return connection info without actual decryption
    // In production, you would:
    // 1. Retrieve the encryption key from secure storage
    // 2. Decrypt the credentials using the stored nonce
    // 3. Use the credentials for broker API calls
    // 4. Never return plain credentials to the client

    return new Response(JSON.stringify({ 
      connection_id: connection.id,
      provider: connection.provider,
      account_label: connection.account_label,
      status: connection.status,
      // Never return decrypted credentials to client
      message: 'Use this function only for server-side broker API calls'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in decrypt function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process request'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
