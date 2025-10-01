import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Bot Worker - Executes active strategy runs
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🤖 Bot Worker tick starting...');

    // Get all active strategy runs
    const { data: runs, error: runsError } = await supabase
      .from('strategy_runs')
      .select('*, strategies(*)')
      .in('status', ['research', 'paper', 'live']);

    if (runsError) throw runsError;

    if (!runs || runs.length === 0) {
      console.log('📭 No active strategy runs');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Processing ${runs.length} active runs`);

    let processed = 0;
    let decisions = 0;
    let orders = 0;

    // Process each run
    for (const run of runs) {
      try {
        const cfg = run.cfg as any;
        const symbols = cfg.symbols || ['SPY'];
        const tf = cfg.tf || '5m';
        
        console.log(`📊 Run ${run.run_id}: ${run.status} mode, ${symbols.length} symbols`);

        for (const symbol of symbols) {
          try {
            // 1. Load market context
            const ctx = await loadMarketCtx(supabase, run.workspace_id, symbol, tf, cfg.params || {});
            
            // 2. Load strategy and make decision
            const strategy = loadStrategy(run.strategies.kind);
            await strategy.indicators?.(ctx);
            const decision = await strategy.decide(ctx, {
              name: run.strategies.name,
              kind: run.strategies.kind,
              params: cfg.params || {},
              risk: cfg.risk || { stop_loss_pct: 0.02 }
            });

            decisions++;
            console.log(`💡 Decision for ${symbol}:`, decision.action);

            if (decision.action === 'none') continue;

            // 3. Build order
            const order = {
              workspace_id: run.workspace_id,
              run_id: run.run_id,
              symbol,
              side: decision.side,
              qty: decision.qty,
              price: ctx.candles[ctx.candles.length - 1]?.c,
              limits: cfg.risk,
              mode: run.status, // research/paper/live
            };

            // 4. Validate via risk-governor
            const { data: gateResult, error: gateError } = await supabase.functions.invoke('risk-governor', {
              body: { workspace_id: run.workspace_id, order }
            });

            if (gateError || !gateResult?.pass) {
              console.log(`🚫 Order blocked: ${gateResult?.reason || 'validation failed'}`);
              
              // Log blocked order
              await supabase.from('rec_events').insert({
                workspace_id: run.workspace_id,
                user_id: run.user_id,
                event_type: 'order.blocked',
                severity: 2,
                entity_type: 'validator',
                entity_id: run.run_id,
                summary: `Order blocked for ${symbol}: ${gateResult?.reason}`,
                payload_json: { order, reason: gateResult?.reason, decision }
              });
              
              continue;
            }

            // 5. Execute via trade-execute
            const { data: execResult, error: execError } = await supabase.functions.invoke('trade-execute', {
              body: {
                workspace_id: run.workspace_id,
                order: {
                  ...order,
                  order_type: 'market',
                  time_in_force: 'day'
                }
              }
            });

            if (execError || !execResult?.success) {
              console.error(`❌ Trade execution failed: ${execError?.message || 'unknown'}`);
              
              // Log failed execution
              await supabase.from('rec_events').insert({
                workspace_id: run.workspace_id,
                user_id: run.user_id,
                event_type: 'order.failed',
                severity: 3,
                entity_type: 'broker',
                entity_id: run.run_id,
                summary: `Trade execution failed for ${symbol}`,
                payload_json: { order, error: execError?.message, decision }
              });
              
              continue;
            }

            orders++;
            console.log(`✅ Order placed: ${symbol} ${decision.side} ${decision.qty}`);

            // Log successful order
            await supabase.from('rec_events').insert({
              workspace_id: run.workspace_id,
              user_id: run.user_id,
              event_type: 'order.placed',
              severity: 1,
              entity_type: 'bot',
              entity_id: run.run_id,
              summary: `${symbol} ${decision.side} ${decision.qty} @ $${order.price}`,
              payload_json: { order: execResult.order, decision, strategy: run.strategies.name }
            });

          } catch (symbolError) {
            console.error(`❌ Error processing ${symbol}:`, symbolError);
            
            await supabase.from('rec_events').insert({
              workspace_id: run.workspace_id,
              user_id: run.user_id,
              event_type: 'bot.symbol_error',
              severity: 2,
              entity_type: 'bot',
              entity_id: run.run_id,
              summary: `Error processing ${symbol}: ${symbolError.message}`,
              payload_json: { symbol, error: String(symbolError) }
            });
          }
        }

        processed++;
        
        // Update run heartbeat
        await supabase
          .from('strategy_runs')
          .update({ updated_at: new Date().toISOString() })
          .eq('run_id', run.run_id);

      } catch (runError) {
        console.error(`❌ Error in run ${run.run_id}:`, runError);
        
        // Mark run as error
        await supabase
          .from('strategy_runs')
          .update({
            status: 'error',
            error_message: String(runError),
            stopped_at: new Date().toISOString()
          })
          .eq('run_id', run.run_id);
      }
    }

    console.log(`✅ Bot worker complete: ${processed} runs, ${decisions} decisions, ${orders} orders`);

    return new Response(
      JSON.stringify({ processed, decisions, orders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Bot Worker Error:', error);
    
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ============================================================================
// Strategy Loading
// ============================================================================

interface Strategy {
  describe(): any;
  indicators?(ctx: any): Promise<void>;
  decide(ctx: any, cfg: any): Promise<any>;
}

function loadStrategy(kind: string): Strategy {
  switch (kind) {
    case 'momentum':
      return TrendRider;
    case 'mean_reversion':
      return MeanReverter;
    case 'breakout':
      return BreakoutScout;
    default:
      throw new Error(`Unknown strategy: ${kind}`);
  }
}

// ============================================================================
// Strategy Implementations (inline for deployment)
// ============================================================================

const TrendRider: Strategy = {
  describe: () => ({
    name: 'Trend Rider',
    kind: 'momentum',
    params: {
      ema_fast: 9,
      ema_slow: 21,
      trailing_stop_pct: 0.03,
      tp_pct: 0.06
    },
    risk: { stop_loss_pct: 0.03, take_profit_pct: 0.06 }
  }),

  async indicators(ctx: any) {
    const closes = ctx.candles.map((c: any) => c.c);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    ctx.indicators = { ema9, ema21 };
  },

  async decide(ctx: any, cfg: any) {
    const { ema9, ema21 } = ctx.indicators || {};
    if (!ema9 || !ema21 || ema9.length < 2 || ema21.length < 2) {
      return { action: 'none', reason: 'insufficient data' };
    }

    const close = ctx.candles[ctx.candles.length - 1].c;
    const ema9Current = ema9[ema9.length - 1];
    const ema21Current = ema21[ema21.length - 1];
    const ema9Prev = ema9[ema9.length - 2];
    const ema21Prev = ema21[ema21.length - 2];

    // Enter long: EMA9 crosses above EMA21 and price > EMA9
    if (ema9Prev <= ema21Prev && ema9Current > ema21Current && close > ema9Current) {
      const qty = sizeByRisk(100000, cfg.risk.max_notional || 5000, close);
      return { action: 'enter', side: 'buy', qty, reason: 'EMA9 > EMA21, momentum confirmed' };
    }

    // Exit long: EMA9 crosses below EMA21
    if (ema9Prev >= ema21Prev && ema9Current < ema21Current) {
      return { action: 'exit', side: 'sell', qty: 1, reason: 'EMA9 < EMA21, momentum faded' };
    }

    return { action: 'none' };
  }
};

const MeanReverter: Strategy = {
  describe: () => ({
    name: 'Mean Reverter',
    kind: 'mean_reversion',
    params: {
      rsi_period: 14,
      oversold: 30,
      overbought: 70
    },
    risk: { stop_loss_pct: 0.02, take_profit_pct: 0.03 }
  }),

  async indicators(ctx: any) {
    const closes = ctx.candles.map((c: any) => c.c);
    const rsi = calculateRSI(closes, 14);
    ctx.indicators = { rsi };
  },

  async decide(ctx: any, cfg: any) {
    const { rsi } = ctx.indicators || {};
    if (!rsi || rsi.length === 0) {
      return { action: 'none', reason: 'no RSI data' };
    }

    const rsiCurrent = rsi[rsi.length - 1];
    const close = ctx.candles[ctx.candles.length - 1].c;

    // Oversold: enter buy
    if (rsiCurrent < 30) {
      const qty = sizeByRisk(100000, cfg.risk.max_notional || 5000, close);
      return { action: 'enter', side: 'buy', qty, reason: `RSI oversold (${rsiCurrent.toFixed(1)})` };
    }

    // Overbought: enter sell
    if (rsiCurrent > 70) {
      const qty = sizeByRisk(100000, cfg.risk.max_notional || 5000, close);
      return { action: 'enter', side: 'sell', qty, reason: `RSI overbought (${rsiCurrent.toFixed(1)})` };
    }

    // Exit buy if RSI > 50
    if (rsiCurrent > 50) {
      return { action: 'exit', side: 'sell', qty: 1, reason: 'RSI normalized' };
    }

    // Exit sell if RSI < 50
    if (rsiCurrent < 50) {
      return { action: 'exit', side: 'buy', qty: 1, reason: 'RSI normalized' };
    }

    return { action: 'none' };
  }
};

const BreakoutScout: Strategy = {
  describe: () => ({
    name: 'Breakout Scout',
    kind: 'breakout',
    params: {
      lookback: 20,
      vol_mult: 1.3
    },
    risk: { stop_loss_pct: 0.025, take_profit_pct: 0.05 }
  }),

  async indicators(ctx: any) {
    const highs = ctx.candles.map((c: any) => c.h);
    const lows = ctx.candles.map((c: any) => c.l);
    const volumes = ctx.candles.map((c: any) => c.v || 0);
    
    const lookback = Math.min(20, ctx.candles.length);
    const recentHighs = highs.slice(-lookback);
    const recentLows = lows.slice(-lookback);
    const recentVolumes = volumes.slice(-lookback);
    
    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    
    ctx.indicators = { maxHigh, minLow, avgVolume };
  },

  async decide(ctx: any, cfg: any) {
    const { maxHigh, minLow, avgVolume } = ctx.indicators || {};
    if (!maxHigh || !minLow || !avgVolume) {
      return { action: 'none', reason: 'insufficient data' };
    }

    const lastCandle = ctx.candles[ctx.candles.length - 1];
    const close = lastCandle.c;
    const volume = lastCandle.v || 0;

    // Breakout up with volume confirmation
    if (close > maxHigh && volume > avgVolume * 1.3) {
      const qty = sizeByRisk(100000, cfg.risk.max_notional || 5000, close);
      return { action: 'enter', side: 'buy', qty, reason: 'Upside breakout + volume' };
    }

    // Breakdown with volume confirmation
    if (close < minLow && volume > avgVolume * 1.3) {
      const qty = sizeByRisk(100000, cfg.risk.max_notional || 5000, close);
      return { action: 'enter', side: 'sell', qty, reason: 'Downside breakdown + volume' };
    }

    // Exit if back inside range
    if (close < maxHigh * 0.98 && close > minLow * 1.02) {
      return { action: 'exit', side: 'sell', qty: 1, reason: 'Back inside range' };
    }

    return { action: 'none' };
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

async function loadMarketCtx(supabase: any, wsId: string, symbol: string, tf: string, params: any) {
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: candles, error } = await supabase.rpc('fetch_candles', {
    _ws: wsId,
    _symbol: symbol,
    _tf: tf,
    _from: from.toISOString(),
    _to: now.toISOString()
  });

  if (error || !candles || candles.length === 0) {
    throw new Error(`No candle data for ${symbol}`);
  }

  return {
    wsId,
    symbol,
    tf,
    candles: candles.map((c: any) => ({
      ts: c.ts,
      o: Number(c.o),
      h: Number(c.h),
      l: Number(c.l),
      c: Number(c.c),
      v: Number(c.v || 0)
    })),
    indicators: {}
  };
}

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
    } else {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 1);
      rsi.push(100 - 100 / (1 + rs));

      const newChange = prices[i] - prices[i - 1];
      gains = (avgGain * (period - 1) + (newChange > 0 ? newChange : 0));
      losses = (avgLoss * (period - 1) + (newChange < 0 ? -newChange : 0));
    }
  }
  return rsi;
}

function sizeByRisk(equity: number, maxNotional: number, price: number): number {
  const notional = Math.min(maxNotional, equity * 0.02);
  return Math.max(1, Math.floor(notional / price));
}
