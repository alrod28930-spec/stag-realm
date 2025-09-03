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

    // Mock order execution (replace with real brokerage integration)
    const orderId = crypto.randomUUID();
    const executedPrice = tradeRequest.price || (Math.random() * 100 + 50); // Mock price
    
    // Simulate order processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

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
        status: 'filled',
        brokerage: 'mock_broker'
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
        error: error.message || 'Failed to execute trade'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})