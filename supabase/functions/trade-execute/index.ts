import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stop_price?: number;
  stop_loss?: number;
  take_profit?: number;
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

    const tradeRequest: TradeRequest = await req.json();

    // Validate required fields
    if (!tradeRequest.symbol || !tradeRequest.side || !tradeRequest.quantity) {
      throw new Error('Missing required fields: symbol, side, quantity');
    }

    // Validate quantity
    if (tradeRequest.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Log trade intent
    await supabaseClient.from('rec_events').insert({
      workspace_id: user.user_metadata?.workspace_id || user.id,
      user_id: user.id,
      event_type: 'trade.manual.intent',
      severity: 1,
      entity_type: 'trade',
      entity_id: tradeRequest.symbol,
      summary: `Manual ${tradeRequest.side} intent for ${tradeRequest.quantity} shares of ${tradeRequest.symbol}`,
      payload_json: {
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        order_type: tradeRequest.order_type,
        quantity: tradeRequest.quantity,
        price: tradeRequest.price,
        stop_price: tradeRequest.stop_price,
        stop_loss: tradeRequest.stop_loss,
        take_profit: tradeRequest.take_profit
      }
    });

    // Get user's Alpaca credentials from database
    let alpacaApiKey: string;
    let alpacaSecretKey: string;
    
    try {
      // Try to get user's stored Alpaca credentials
      const { data: connections } = await supabaseClient
        .from('connections_brokerages')
        .select('id, broker_type')
        .eq('user_id', user.id)
        .eq('broker_type', 'alpaca')
        .eq('is_active', true)
        .limit(1);

      if (connections && connections.length > 0) {
        // Decrypt the user's credentials
        const { data: credentialsData, error: credError } = await supabaseClient.functions.invoke('decrypt-brokerage-credentials', {
          body: { connection_id: connections[0].id }
        });

        if (credError || !credentialsData?.success) {
          throw new Error('Failed to decrypt user credentials');
        }

        alpacaApiKey = credentialsData.credentials.api_key;
        alpacaSecretKey = credentialsData.credentials.secret_key;
      } else {
        // Fallback to demo/paper trading with mock credentials for testing
        console.log('No user credentials found, using demo mode');
        
        // Create a demo order response instead of calling Alpaca
        const demoOrderId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const demoPrice = tradeRequest.price || (100 + Math.random() * 200); // Random price between 100-300
        
        // Log demo trade execution
        await supabaseClient.from('rec_events').insert({
          workspace_id: user.user_metadata?.workspace_id || user.id,
          user_id: user.id,
          event_type: 'trade.manual.demo',
          severity: 1,
          entity_type: 'trade',
          entity_id: tradeRequest.symbol,
          summary: `Demo ${tradeRequest.side} executed: ${tradeRequest.quantity} shares of ${tradeRequest.symbol} @ $${demoPrice.toFixed(2)}`,
          payload_json: {
            order_id: demoOrderId,
            symbol: tradeRequest.symbol,
            side: tradeRequest.side,
            order_type: tradeRequest.order_type,
            quantity: tradeRequest.quantity,
            executed_price: demoPrice,
            status: 'filled',
            mode: 'demo'
          }
        });

        return new Response(
          JSON.stringify({
            success: true,
            order_id: demoOrderId,
            status: 'executed',
            executed_price: demoPrice,
            mode: 'demo',
            message: `Demo ${tradeRequest.side === 'buy' ? 'bought' : 'sold'} ${tradeRequest.quantity} shares of ${tradeRequest.symbol} @ $${demoPrice.toFixed(2)} (Connect your Alpaca account in Settings for real trading)`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    } catch (error) {
      console.error('Error getting user credentials:', error);
      throw new Error('Failed to retrieve trading credentials. Please check your brokerage connection in Settings.');
    }

    const alpacaOrder = {
      symbol: tradeRequest.symbol,
      qty: tradeRequest.quantity.toString(),
      side: tradeRequest.side,
      type: tradeRequest.order_type === 'market' ? 'market' : 'limit',
      time_in_force: 'day',
      ...(tradeRequest.price && { limit_price: tradeRequest.price.toString() }),
      ...(tradeRequest.stop_price && { stop_price: tradeRequest.stop_price.toString() })
    };

    const alpacaResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alpacaOrder),
    });

    if (!alpacaResponse.ok) {
      const errorData = await alpacaResponse.json();
      throw new Error(`Alpaca order failed: ${errorData.message || alpacaResponse.status}`);
    }

    const alpacaResult = await alpacaResponse.json();
    const orderId = alpacaResult.id;
    const executedPrice = parseFloat(alpacaResult.filled_avg_price || tradeRequest.price || '0');

    // Log successful execution
    await supabaseClient.from('rec_events').insert({
      workspace_id: user.user_metadata?.workspace_id || user.id,
      user_id: user.id,
      event_type: 'trade.manual.executed',
      severity: 1,
      entity_type: 'trade',
      entity_id: tradeRequest.symbol,
      summary: `Manual ${tradeRequest.side} executed: ${tradeRequest.quantity} shares of ${tradeRequest.symbol} @ $${executedPrice.toFixed(2)}`,
      payload_json: {
        order_id: orderId,
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        order_type: tradeRequest.order_type,
        quantity: tradeRequest.quantity,
        executed_price: executedPrice,
        status: alpacaResult.status === 'filled' ? 'filled' : 'pending',
        brokerage: 'alpaca_paper',
        alpaca_order_id: orderId
      }
    });

    // Trigger portfolio sync after successful trade
    try {
      const { error: syncError } = await supabaseClient.functions.invoke('alpaca-sync');
      if (syncError) {
        console.warn('Portfolio sync failed after trade:', syncError);
      }
    } catch (syncError) {
      console.warn('Portfolio sync error after trade:', syncError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        status: 'executed',
        executed_price: executedPrice,
        message: `Successfully ${tradeRequest.side === 'buy' ? 'bought' : 'sold'} ${tradeRequest.quantity} shares of ${tradeRequest.symbol}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Trade execution error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute trade'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})