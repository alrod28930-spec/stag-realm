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

    const { apiKey, secretKey } = await req.json()

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'API key and secret key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test against paper trading endpoint first
    let accountType = 'unknown'
    let accountInfo = null
    
    try {
      console.log('Testing paper trading endpoint...')
      const paperResponse = await fetch('https://paper-api.alpaca.markets/v2/account', {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': secretKey,
        },
      })

      if (paperResponse.ok) {
        accountInfo = await paperResponse.json()
        accountType = 'paper'
        console.log('Successfully connected to paper trading account')
      }
    } catch (error) {
      console.log('Paper trading test failed:', error)
    }

    // If paper failed, test live trading endpoint
    if (accountType === 'unknown') {
      try {
        console.log('Testing live trading endpoint...')
        const liveResponse = await fetch('https://api.alpaca.markets/v2/account', {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': secretKey,
          },
        })

        if (liveResponse.ok) {
          accountInfo = await liveResponse.json()
          accountType = 'live'
          console.log('Successfully connected to live trading account')
        }
      } catch (error) {
        console.log('Live trading test failed:', error)
      }
    }

    if (accountType === 'unknown') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API credentials',
          message: 'Could not connect to either paper or live trading accounts'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve workspace
    let workspaceId: string;
    try {
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1);
      workspaceId = memberships?.[0]?.workspace_id || user.user_metadata?.workspace_id || user.id;
    } catch (_) {
      workspaceId = user.user_metadata?.workspace_id || user.id;
    }

    // Store credentials with detected account type
    const { error: storeError } = await supabase
      .from('connections_brokerages')
      .upsert({
        workspace_id: workspaceId,
        provider: 'alpaca',
        account_label: `Alpaca ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account`,
        api_key_cipher: new TextEncoder().encode(apiKey), // In production, this should be properly encrypted
        api_secret_cipher: new TextEncoder().encode(secretKey),
        nonce: new TextEncoder().encode('dummy_nonce'), // In production, use proper encryption nonce
        scope: { 
          account_type: accountType,
          trading_permissions: accountInfo?.trading_permissions || [],
          account_status: accountInfo?.status || 'unknown'
        }
      })

    if (storeError) {
      console.error('Error storing credentials:', storeError)
      return new Response(
        JSON.stringify({ error: 'Failed to store credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        accountType,
        accountStatus: accountInfo?.status,
        tradingPermissions: accountInfo?.trading_permissions || [],
        buyingPower: accountInfo?.buying_power,
        portfolioValue: accountInfo?.portfolio_value,
        message: `Connected to ${accountType} trading account successfully`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Account type detection error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to detect account type', 
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