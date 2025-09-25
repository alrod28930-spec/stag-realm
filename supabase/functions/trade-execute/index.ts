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

    // Execute trade through Alpaca Paper Trading API
    const alpacaApiKey = Deno.env.get('ALPACA_API_KEY');
    const alpacaSecretKey = Deno.env.get('ALPACA_SECRET_KEY');
    
    if (!alpacaApiKey || !alpacaSecretKey) {
      throw new Error('Alpaca API credentials not configured');
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