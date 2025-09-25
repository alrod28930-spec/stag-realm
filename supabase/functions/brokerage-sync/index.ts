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

    // Get request body
    const { workspace_id, connection_id } = await req.json();
    
    if (!workspace_id) {
      throw new Error('workspace_id is required');
    }

    console.log(`Starting brokerage sync for workspace ${workspace_id}, connection ${connection_id || 'all'}`);

    // Get brokerage connections
    let query = supabaseClient
      .from('connections_brokerages')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'active');

    if (connection_id) {
      query = query.eq('id', connection_id);
    }

    const { data: connections, error: connectionsError } = await query;

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      throw new Error('No active brokerage connections found');
    }

    const syncResults = [];

    // Sync each connection using the decrypt function
    for (const connection of connections) {
      try {
        console.log(`Syncing connection ${connection.id} - ${connection.provider}`);

        // Use the existing decrypt function
        const decryptResponse = await supabaseClient.functions.invoke('decrypt-brokerage-credentials', {
          body: { connection_id: connection.id }
        });

        if (decryptResponse.error || !decryptResponse.data?.success) {
          throw new Error(`Failed to decrypt credentials: ${decryptResponse.error?.message || 'Unknown error'}`);
        }

        const { api_key: apiKey, api_secret: apiSecret } = decryptResponse.data;

        if (connection.provider.toLowerCase() === 'alpaca') {
          const isLive = connection.scope?.live === true;
          const baseUrl = isLive ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
          
          // Sync Alpaca account
          const accountResponse = await fetch(`${baseUrl}/v2/account`, {
            headers: {
              'APCA-API-KEY-ID': apiKey,
              'APCA-API-SECRET-KEY': apiSecret,
            },
          });

          if (!accountResponse.ok) {
            throw new Error(`Failed to fetch account: ${accountResponse.status}`);
          }

          const account = await accountResponse.json();
          
          // Update portfolio summary
          await supabaseClient
            .from('portfolio_current')
            .upsert({
              workspace_id,
              cash: parseFloat(account.cash),
              equity: parseFloat(account.equity),
              updated_at: new Date().toISOString()
            });

          // Update connection last_sync
          await supabaseClient
            .from('connections_brokerages')
            .update({ last_sync: new Date().toISOString() })
            .eq('id', connection.id);

          syncResults.push({
            connection_id: connection.id,
            provider: connection.provider,
            success: true,
            data: { equity: parseFloat(account.equity), cash: parseFloat(account.cash) }
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncResults.push({
          connection_id: connection.id,
          provider: connection.provider,
          success: false,
          error: errorMessage
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Synced ${successCount} connections successfully`,
        results: syncResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync brokerage accounts';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});