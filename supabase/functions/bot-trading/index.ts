import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BotTradeRequest {
  bot_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  strategy: string;
  confidence: number;
  signals: Array<{
    type: string;
    strength: number;
    source: string;
  }>;
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

    const tradeRequest: BotTradeRequest = await req.json();

    // Validate required fields
    if (!tradeRequest.bot_id || !tradeRequest.symbol || !tradeRequest.side || !tradeRequest.quantity) {
      throw new Error('Missing required fields');
    }

    // Get bot profile to verify it's active and in correct mode
    const { data: botProfile, error: botError } = await supabaseClient
      .from('bot_profiles')
      .select('*')
      .eq('workspace_id', tradeRequest.bot_id)
      .eq('active', true)
      .single();

    if (botError || !botProfile) {
      throw new Error('Bot not found or not active');
    }

    // Check if bot is within daily trade limits
    const today = new Date().toISOString().split('T')[0];
    const { count: todayTrades } = await supabaseClient
      .from('rec_events')
      .select('*', { count: 'exact' })
      .eq('entity_id', tradeRequest.bot_id)
      .in('event_type', ['trade.bot.executed'])
      .gte('ts', `${today}T00:00:00.000Z`)
      .lte('ts', `${today}T23:59:59.999Z`);

    const maxTrades = botProfile.mode === 'intraday' ? 
      botProfile.intraday_max_trades : 
      botProfile.max_trades_per_day;

    if ((todayTrades || 0) >= maxTrades) {
      throw new Error('Daily trade limit reached');
    }

    // Log bot trade intent
    await supabaseClient.from('rec_events').insert({
      workspace_id: botProfile.workspace_id,
      user_id: user.id,
      event_type: 'trade.bot.intent',
      severity: 1,
      entity_type: 'bot',
      entity_id: tradeRequest.bot_id,
      summary: `Bot ${botProfile.name} ${tradeRequest.side} intent: ${tradeRequest.quantity} shares of ${tradeRequest.symbol}`,
      payload_json: {
        bot_id: tradeRequest.bot_id,
        bot_name: botProfile.name,
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        quantity: tradeRequest.quantity,
        price: tradeRequest.price,
        strategy: tradeRequest.strategy,
        confidence: tradeRequest.confidence,
        signals: tradeRequest.signals,
        mode: botProfile.mode
      }
    });

    // Mock bot order execution (replace with real brokerage integration)
    const orderId = crypto.randomUUID();
    const executedPrice = tradeRequest.price || (Math.random() * 100 + 50);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Log successful bot execution
    await supabaseClient.from('rec_events').insert({
      workspace_id: botProfile.workspace_id,
      user_id: user.id,
      event_type: 'trade.bot.executed',
      severity: 1,
      entity_type: 'bot',
      entity_id: tradeRequest.bot_id,
      summary: `Bot ${botProfile.name} executed: ${tradeRequest.quantity} shares of ${tradeRequest.symbol} @ $${executedPrice.toFixed(2)}`,
      payload_json: {
        order_id: orderId,
        bot_id: tradeRequest.bot_id,
        bot_name: botProfile.name,
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        quantity: tradeRequest.quantity,
        executed_price: executedPrice,
        strategy: tradeRequest.strategy,
        confidence: tradeRequest.confidence,
        mode: botProfile.mode,
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
        bot_id: tradeRequest.bot_id,
        message: `Bot ${botProfile.name} successfully executed ${tradeRequest.side} order`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Bot trading error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to execute bot trade'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})