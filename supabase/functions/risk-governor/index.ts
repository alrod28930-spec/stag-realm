import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  workspaceId: string;
  userId: string;
  accountEquity: number;
  currentPrice: number;
}

interface RiskLimits {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxRiskPerTrade: number;
  maxConcurrentPositions: number;
  dailyTradeLimit: number;
  blacklistedSymbols: string[];
  minPrice: number;
  maxLeverage: number;
}

interface PortfolioState {
  totalValue: number;
  dailyPnL: number;
  openPositions: number;
  dayTrades: number;
  currentRisk: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      symbol, 
      side, 
      type, 
      quantity, 
      price, 
      stopLoss, 
      takeProfit, 
      workspaceId, 
      userId,
      accountEquity,
      currentPrice
    }: OrderRequest = await req.json();

    console.log('🛡️ Risk Governor - Processing order:', {
      symbol,
      side,
      type,
      quantity,
      workspaceId,
      userId
    });

    // Get risk settings for workspace
    const { data: riskSettings, error: riskError } = await supabase
      .from('risk_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (riskError) {
      console.error('Error fetching risk settings:', riskError);
      throw new Error('Failed to load risk settings');
    }

    const limits: RiskLimits = {
      maxDailyLoss: riskSettings.daily_drawdown_halt_pct * accountEquity,
      maxPositionSize: riskSettings.per_trade_risk_pct * accountEquity,
      maxRiskPerTrade: riskSettings.per_trade_risk_pct,
      maxConcurrentPositions: 10, // Default limit
      dailyTradeLimit: 20, // Default PDT limit consideration
      blacklistedSymbols: [], // Would come from blacklists table
      minPrice: riskSettings.min_price || 5.00,
      maxLeverage: riskSettings.leverage_cap || 1.0
    };

    // Get current portfolio state
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolio_current')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    const { data: positions, error: positionsError } = await supabase
      .from('positions_current')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Get today's trades for day trading count
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTrades, error: tradesError } = await supabase
      .from('rec_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'trade_executed')
      .gte('ts', `${today}T00:00:00Z`)
      .lte('ts', `${today}T23:59:59Z`);

    const portfolioState: PortfolioState = {
      totalValue: portfolio?.equity || accountEquity,
      dailyPnL: portfolio?.equity - accountEquity || 0,
      openPositions: positions?.length || 0,
      dayTrades: todayTrades?.length || 0,
      currentRisk: 0 // Calculate from open positions
    };

    console.log('📊 Portfolio state:', portfolioState);

    // RISK CHECKS

    // 1. Check if symbol is blacklisted
    const { data: blacklist } = await supabase
      .from('blacklists')
      .select('symbol')
      .eq('workspace_id', workspaceId)
      .eq('symbol', symbol)
      .single();

    if (blacklist) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'BLACKLISTED_SYMBOL',
        message: `${symbol} is blacklisted for trading`,
        riskLevel: 'HIGH'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // 2. Check minimum price requirement
    const orderPrice = price || currentPrice;
    if (orderPrice < limits.minPrice) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'MIN_PRICE_VIOLATION',
        message: `Price ${orderPrice} below minimum ${limits.minPrice}`,
        riskLevel: 'HIGH'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // 3. Check daily loss limit
    if (portfolioState.dailyPnL <= -limits.maxDailyLoss) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'DAILY_LOSS_LIMIT',
        message: `Daily loss limit of $${limits.maxDailyLoss.toFixed(0)} reached`,
        riskLevel: 'CRITICAL'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // 4. Check position size limits
    const positionValue = quantity * orderPrice;
    if (positionValue > limits.maxPositionSize) {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'POSITION_SIZE_LIMIT',
        message: `Position size $${positionValue.toFixed(0)} exceeds limit $${limits.maxPositionSize.toFixed(0)}`,
        riskLevel: 'HIGH'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // 5. Check risk per trade (if stop loss provided)
    if (stopLoss) {
      const riskPerShare = Math.abs(orderPrice - stopLoss);
      const totalRisk = riskPerShare * quantity;
      const riskPercent = (totalRisk / accountEquity) * 100;

      if (riskPercent > limits.maxRiskPerTrade * 100) {
        return new Response(JSON.stringify({
          allowed: false,
          reason: 'RISK_PER_TRADE_LIMIT',
          message: `Risk ${riskPercent.toFixed(2)}% exceeds limit ${(limits.maxRiskPerTrade * 100).toFixed(2)}%`,
          riskLevel: 'HIGH'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        });
      }
    }

    // 6. Check maximum concurrent positions
    if (portfolioState.openPositions >= limits.maxConcurrentPositions && side === 'buy') {
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'MAX_POSITIONS_LIMIT',
        message: `Maximum ${limits.maxConcurrentPositions} concurrent positions reached`,
        riskLevel: 'MEDIUM'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // 7. Check day trading limits (PDT rule)
    if (portfolioState.dayTrades >= 3 && accountEquity < 25000) {
      // Check if this would be a day trade
      const existingPosition = positions?.find(p => p.symbol === symbol);
      const wouldBeDayTrade = existingPosition && side === 'sell';
      
      if (wouldBeDayTrade) {
        return new Response(JSON.stringify({
          allowed: false,
          reason: 'PDT_VIOLATION',
          message: 'Pattern Day Trader rule: 3 day trades reached with account < $25k',
          riskLevel: 'CRITICAL'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        });
      }
    }

    // 8. Calculate overall risk score
    let riskScore = 0;
    let riskLevel = 'LOW';

    // Add risk based on portfolio state
    if (portfolioState.dailyPnL < -limits.maxDailyLoss * 0.5) riskScore += 30;
    if (portfolioState.openPositions >= limits.maxConcurrentPositions * 0.7) riskScore += 20;
    if (portfolioState.dayTrades >= 2) riskScore += 15;
    if (positionValue > limits.maxPositionSize * 0.7) riskScore += 25;

    // Market condition risks
    if (symbol === 'SPY' && type === 'market') riskScore += 10; // Market orders on ETFs
    
    if (riskScore >= 70) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';

    // Log the risk assessment
    await supabase.from('rec_events').insert({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: 'risk_assessment',
      severity: riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 2 : 1,
      entity_type: 'order',
      entity_id: `${symbol}_${Date.now()}`,
      summary: `Risk assessment for ${side} ${quantity} ${symbol}`,
      payload_json: {
        symbol,
        side,
        type,
        quantity,
        price: orderPrice,
        riskScore,
        riskLevel,
        portfolioState,
        limits
      }
    });

    console.log('✅ Risk assessment passed:', {
      riskScore,
      riskLevel,
      allowed: true
    });

    // All checks passed - approve the order
    return new Response(JSON.stringify({
      allowed: true,
      riskScore,
      riskLevel,
      message: `Order approved with ${riskLevel} risk level`,
      limits: {
        remainingDailyLoss: limits.maxDailyLoss + portfolioState.dailyPnL,
        remainingPositions: limits.maxConcurrentPositions - portfolioState.openPositions,
        remainingDayTrades: Math.max(0, 3 - portfolioState.dayTrades)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Risk Governor error:', error);
    
    return new Response(JSON.stringify({
      allowed: false,
      reason: 'SYSTEM_ERROR',
      message: 'Risk assessment system unavailable',
      riskLevel: 'UNKNOWN'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});