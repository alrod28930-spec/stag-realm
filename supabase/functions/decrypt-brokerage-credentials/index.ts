import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { connectionId } = await req.json()

    if (!connectionId) {
      return new Response('Connection ID required', { status: 400, headers: corsHeaders })
    }

    // Get the encrypted credentials
    const { data: connection, error: connectionError } = await supabase
      .from('connections_brokerages')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      return new Response('Connection not found', { status: 404, headers: corsHeaders })
    }

    // Verify user has access to this connection
    const { data: hasAccess } = await supabase.rpc('is_member_of_workspace', {
      w_id: connection.workspace_id
    })

    if (!hasAccess) {
      return new Response('Access denied', { status: 403, headers: corsHeaders })
    }

    // For now, return mock decrypted credentials (in production, implement real decryption)
    // This is a simplified version - in production you'd use proper encryption/decryption
    const mockApiKey = "PKTEST12345"; // This would be decrypted from connection.api_key_cipher
    const mockSecretKey = "abcdef123456"; // This would be decrypted from connection.api_secret_cipher

    return new Response(
      JSON.stringify({ 
        apiKey: mockApiKey,
        apiSecret: mockSecretKey,
        provider: connection.provider,
        accountLabel: connection.account_label
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Decrypt credentials error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to decrypt credentials', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})