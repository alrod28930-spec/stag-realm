import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Resolve workspace
    let workspaceId: string;
    try {
      const { data: memberships } = await supabaseClient
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1);
      workspaceId = memberships?.[0]?.workspace_id || user.user_metadata?.workspace_id || user.id;
    } catch (_) {
      workspaceId = user.user_metadata?.workspace_id || user.id;
    }

    // Get user's Alpaca credentials from database via active brokerage connection
    let alpacaApiKey: string;
    let alpacaSecretKey: string;
    
    try {
      const { data: connections, error: connError } = await supabaseClient
        .from('connections_brokerages')
        .select('id, provider, status, workspace_id')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'alpaca')
        .eq('status', 'active')
        .limit(1);

      if (connError) throw connError;
      if (!connections || connections.length === 0) {
        throw new Error('No active Alpaca connection found for this workspace.');
      }

      // Decrypt the user's credentials
      const { data: credentialsData, error: credError } = await supabaseClient.functions.invoke('decrypt-brokerage-credentials', {
        body: { connectionId: connections[0].id }
      });

      if (credError || !credentialsData?.success || !credentialsData?.credentials) {
        throw new Error('Failed to decrypt Alpaca credentials for this connection.');
      }

      alpacaApiKey = credentialsData.credentials.api_key || credentialsData.credentials.apiKey;
      alpacaSecretKey = credentialsData.credentials.secret_key || credentialsData.credentials.apiSecret;
      if (!alpacaApiKey || !alpacaSecretKey) {
        throw new Error('Decrypted credentials are missing api key or secret.');
      }
    } catch (error) {
      console.error('Error getting user credentials:', error);
      throw new Error('Failed to retrieve Alpaca credentials. Please check your brokerage connection in Settings.');
    }

    // Fetch Alpaca account info
    const accountResponse = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
      },
    });

    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch Alpaca account: ${accountResponse.status}`);
    }

    const account = await accountResponse.json();

    // Fetch Alpaca positions
    const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
      },
    });

    if (!positionsResponse.ok) {
      throw new Error(`Failed to fetch Alpaca positions: ${positionsResponse.status}`);
    }

    const alpacaPositions = await positionsResponse.json();

    // Update or insert portfolio summary
    const { error: portfolioError } = await supabaseClient
      .from('portfolio_current')
      .upsert({
        workspace_id: workspaceId,
        cash: parseFloat(account.cash),
        equity: parseFloat(account.equity),
        updated_at: new Date().toISOString()
      });

    if (portfolioError) throw portfolioError;

    // Clear existing positions for this workspace
    const { error: clearError } = await supabaseClient
      .from('positions_current')
      .delete()
      .eq('workspace_id', workspaceId);

    if (clearError) throw clearError;

    // Insert current positions
    if (alpacaPositions.length > 0) {
      const positionsToInsert = alpacaPositions.map((pos: any) => ({
        workspace_id: workspaceId,
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        avg_cost: parseFloat(pos.avg_cost || pos.cost_basis),
        mv: parseFloat(pos.market_value),
        unr_pnl: parseFloat(pos.unrealized_pl),
        r_pnl: parseFloat(pos.realized_pl || '0'),
        updated_at: new Date().toISOString()
      }));

      const { error: positionsError } = await supabaseClient
        .from('positions_current')
        .insert(positionsToInsert);

      if (positionsError) throw positionsError;
    }

    // Log sync event
    await supabaseClient.from('rec_events').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      event_type: 'portfolio.sync',
      severity: 1,
      entity_type: 'portfolio',
      entity_id: 'alpaca_sync',
      summary: `Portfolio synced from Alpaca: ${alpacaPositions.length} positions, $${parseFloat(account.equity).toFixed(2)} equity`,
      payload_json: {
        positions_count: alpacaPositions.length,
        equity: parseFloat(account.equity),
        cash: parseFloat(account.cash),
        sync_timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Portfolio synced successfully',
        data: {
          equity: parseFloat(account.equity),
          cash: parseFloat(account.cash),
          positions_count: alpacaPositions.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    // TypeScript error handling fix
    console.error('Alpaca sync error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync with Alpaca'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});