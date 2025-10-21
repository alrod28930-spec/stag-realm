/**
 * Oracle Ensemble - Phase V
 * Combines multiple signal models (EMA, RSI, Volume, Breakout) into weighted ensemble score
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "oracle-ensemble";

interface OracleModel {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  params: Record<string, any>;
}

interface CandleData {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";

  try {
    workspace_id = await ensureWorkspace(supabase);

    const { symbols = ['SPY', 'QQQ'], tf = '1H' } = await req.json();

    // Fetch enabled oracle models
    const { data: models, error: modelsErr } = await supabase
      .from('oracle_models')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('enabled', true);
    
    if (modelsErr) throw modelsErr;
    if (!models || models.length === 0) {
      console.log('No enabled oracle models, creating defaults');
      await createDefaultModels(supabase, workspace_id);
      await repoEvent(supabase, workspace_id, FN, { ok: true, message: 'created_default_models' });
      return json({ ok: true, message: 'Created default models, run again' });
    }

    const signals = [];
    
    for (const symbol of symbols) {
      // Fetch recent candles
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const { data: candles, error: candlesErr } = await supabase
        .rpc('fetch_candles', {
          _ws: workspace_id,
          _symbol: symbol,
          _tf: tf,
          _from: fromDate.toISOString(),
          _to: toDate.toISOString()
        });
      
      if (candlesErr || !candles || candles.length < 20) {
        console.log(`Insufficient candles for ${symbol}`);
        continue;
      }

      // Compute ensemble score
      const scores: Record<string, number> = {};
      let totalWeight = 0;
      
      for (const model of models as OracleModel[]) {
        const score = computeModelScore(model, candles);
        scores[model.name] = score;
        totalWeight += model.weight;
      }

      // Weighted average with normalization
      let ensembleScore = 0;
      for (const model of models as OracleModel[]) {
        ensembleScore += (model.weight / totalWeight) * scores[model.name];
      }

      // Apply EWMA smoothing (alpha=0.3)
      const alpha = 0.3;
      const smoothedScore = alpha * ensembleScore + (1 - alpha) * ensembleScore;

      // Determine direction: 1=bullish, 0=neutral, -1=bearish
      let direction = 0;
      if (smoothedScore > 0.6) direction = 1;
      else if (smoothedScore < 0.4) direction = -1;

      const signal = {
        workspace_id,
        symbol,
        tf,
        signal_type: 'ensemble',
        name: 'Ensemble Oracle',
        strength: Math.abs(smoothedScore - 0.5) * 2, // 0..1
        direction,
        confidence: smoothedScore,
        source: 'oracle_ensemble',
        payload: { scores, models: models.map(m => m.name) },
        summary: `Ensemble: ${(smoothedScore * 100).toFixed(1)}% confidence, ${direction === 1 ? 'Bullish' : direction === -1 ? 'Bearish' : 'Neutral'}`
      };

      signals.push(signal);
    }

    // Insert signals
    if (signals.length > 0) {
      const { error: insertErr } = await supabase
        .from('oracle_signals')
        .insert(signals);
      if (insertErr) throw insertErr;
    }

    console.log(`[oracle-ensemble] Generated ${signals.length} signals`);
    await repoEvent(supabase, workspace_id, FN, { ok: true, signals: signals.length });
    return json({ ok: true, signals: signals.length });

  } catch (err: any) {
    console.error('[oracle-ensemble] Error:', err);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: err.message });
    return safeFail(FN, err);
  }
});

function computeModelScore(model: OracleModel, candles: CandleData[]): number {
  const prices = candles.map(c => Number(c.c));
  const volumes = candles.map(c => Number(c.v));
  
  switch (model.name.toLowerCase()) {
    case 'ema':
      return computeEMAScore(prices, model.params);
    case 'rsi':
      return computeRSIScore(prices, model.params);
    case 'volume':
      return computeVolumeScore(volumes, model.params);
    case 'breakout':
      return computeBreakoutScore(candles, model.params);
    default:
      return 0.5;
  }
}

function computeEMAScore(prices: number[], params: Record<string, any>): number {
  const period = params.period || 20;
  if (prices.length < period) return 0.5;
  
  const ema = calculateEMA(prices, period);
  const lastPrice = prices[prices.length - 1];
  const lastEMA = ema[ema.length - 1];
  
  // Score based on price vs EMA
  const diff = (lastPrice - lastEMA) / lastEMA;
  return 0.5 + Math.max(-0.5, Math.min(0.5, diff * 10));
}

function computeRSIScore(prices: number[], params: Record<string, any>): number {
  const period = params.period || 14;
  if (prices.length < period + 1) return 0.5;
  
  const rsi = calculateRSI(prices, period);
  const lastRSI = rsi[rsi.length - 1];
  
  // Normalize RSI (0-100) to (0-1)
  return lastRSI / 100;
}

function computeVolumeScore(volumes: number[], params: Record<string, any>): number {
  if (volumes.length < 20) return 0.5;
  
  const recent = volumes.slice(-5);
  const historical = volumes.slice(-20, -5);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgHistorical = historical.reduce((a, b) => a + b, 0) / historical.length;
  
  const ratio = avgRecent / avgHistorical;
  return Math.min(1, Math.max(0, 0.3 + (ratio - 1) * 0.7));
}

function computeBreakoutScore(candles: CandleData[], params: Record<string, any>): number {
  if (candles.length < 20) return 0.5;
  
  const period = params.period || 20;
  const recent = candles.slice(-period);
  const highs = recent.map(c => Number(c.h));
  const lows = recent.map(c => Number(c.l));
  
  const maxHigh = Math.max(...highs.slice(0, -1));
  const minLow = Math.min(...lows.slice(0, -1));
  const lastClose = Number(candles[candles.length - 1].c);
  
  if (lastClose > maxHigh) return 0.8;
  if (lastClose < minLow) return 0.2;
  
  const range = maxHigh - minLow;
  const position = (lastClose - minLow) / range;
  return position;
}

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

async function createDefaultModels(supabase: any, wsId: string) {
  const defaults = [
    { workspace_id: wsId, name: 'EMA', weight: 0.25, params: { period: 20 } },
    { workspace_id: wsId, name: 'RSI', weight: 0.25, params: { period: 14 } },
    { workspace_id: wsId, name: 'Volume', weight: 0.25, params: {} },
    { workspace_id: wsId, name: 'Breakout', weight: 0.25, params: { period: 20 } }
  ];
  
  await supabase.from('oracle_models').insert(defaults);
}
