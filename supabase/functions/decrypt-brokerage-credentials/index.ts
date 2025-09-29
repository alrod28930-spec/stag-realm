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

    // Get the connection metadata (we'll use env vars for actual credentials)
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

    // Use environment variables as the single source of truth
    const apiKey = Deno.env.get('ALPACA_API_KEY');
    const secretKey = Deno.env.get('ALPACA_SECRET_KEY');
    
    if (!apiKey || !secretKey) {
      console.error('Missing Alpaca credentials in environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Alpaca credentials not configured. Please set ALPACA_API_KEY and ALPACA_SECRET_KEY.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully retrieved Alpaca credentials from environment');

    return new Response(
      JSON.stringify({ 
        success: true,
        credentials: {
          api_key: apiKey,
          secret_key: secretKey
        },
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
    console.error('Get credentials error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get credentials', 
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