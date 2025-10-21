/**
 * Offline Simulator - Phase V
 * Deterministic backtester for policy evaluation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Trade {
  entry: number;
  exit: number;
  direction: 'long' | 'short';
  pnl: number;
  rr: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: wm } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();
    if (!wm) throw new Error('No workspace');
    const wsId = wm.workspace_id;

    const { symbol, tf = '1H', fromISO, toISO, policy_id } = await req.json();
    
    if (!symbol || !fromISO || !toISO || !policy_id) {
      throw new Error('Missing required params: symbol, fromISO, toISO, policy_id');
    }

    // Fetch policy
    const { data: policy, error: policyErr } = await supabase
      .from('rl_policies')
      .select('*')
      .eq('id', policy_id)
      .eq('workspace_id', wsId)
      .single();
    
    if (policyErr || !policy) throw new Error('Policy not found');

    // Fetch candles
    const { data: candles, error: candlesErr } = await supabase
      .rpc('fetch_candles', {
        _ws: wsId,
        _symbol: symbol,
        _tf: tf,
        _from: fromISO,
        _to: toISO
      });

    if (candlesErr || !candles || candles.length === 0) {
      throw new Error('No candles found');
    }

    console.log(`[offline-sim] Simulating ${candles.length} candles for ${symbol}`);

    // Extract policy params
    const params = policy.params || {};
    const stopLossPct = params.stop_loss || 0.02;
    const takeProfitPct = params.take_profit || 0.04;
    const riskPct = params.risk_pct || 0.02;
    const slippageBps = params.slippage_bps || 2;

    // Simple strategy: buy when close > EMA20, sell when close < EMA20
    const prices = candles.map((c: any) => Number(c.c));
    const ema = calculateEMA(prices, 20);
    
    const trades: Trade[] = [];
    let position: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let stopPrice = 0;
    let targetPrice = 0;

    for (let i = 20; i < candles.length; i++) {
      const price = prices[i];
      const emaVal = ema[i];

      if (!position) {
        // Entry logic
        if (price > emaVal * 1.01) {
          // Long entry
          const slippage = price * (slippageBps / 10000);
          entryPrice = price + slippage;
          stopPrice = entryPrice * (1 - stopLossPct);
          targetPrice = entryPrice * (1 + takeProfitPct);
          position = 'long';
        }
      } else if (position === 'long') {
        // Exit logic
        const low = Number(candles[i].l);
        const high = Number(candles[i].h);

        if (low <= stopPrice) {
          // Stop hit
          const exitPrice = stopPrice;
          const pnl = (exitPrice - entryPrice) / entryPrice;
          const rr = Math.abs(pnl / stopLossPct);
          trades.push({ entry: entryPrice, exit: exitPrice, direction: 'long', pnl, rr });
          position = null;
        } else if (high >= targetPrice) {
          // Target hit
          const exitPrice = targetPrice;
          const pnl = (exitPrice - entryPrice) / entryPrice;
          const rr = Math.abs(pnl / stopLossPct);
          trades.push({ entry: entryPrice, exit: exitPrice, direction: 'long', pnl, rr });
          position = null;
        }
      }
    }

    // Calculate metrics
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? wins.length / trades.length : 0;
    const avgRR = trades.length > 0 
      ? trades.reduce((sum, t) => sum + t.rr, 0) / trades.length 
      : 0;
    const pnlBp = trades.reduce((sum, t) => sum + t.pnl, 0) * 10000;
    
    // Sharpe (simplified)
    const returns = trades.map(t => t.pnl);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const result = {
      trades: trades.length,
      win_rate: winRate,
      pnl_bp: pnlBp,
      avg_rr: avgRR,
      sharpe
    };

    console.log(`[offline-sim] Results:`, result);

    // Save to rl_policy_results
    await supabase.from('rl_policy_results').insert({
      workspace_id: wsId,
      policy_id,
      time_window: `backtest_${symbol}_${fromISO}_${toISO}`,
      trades: result.trades,
      win_rate: result.win_rate,
      pnl_bp: result.pnl_bp,
      avg_rr: result.avg_rr,
      sharpe: result.sharpe
    });

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[offline-sim] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}
