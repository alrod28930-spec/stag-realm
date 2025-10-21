import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Oracle Scan v2 - Real-time Signal Generation
 * Scans market data, applies deterministic indicators
 * Generates signals based on pattern templates from BID
 */

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const workspace_id = await ensureWorkspace(supabase);

    const body = await req.json().catch(() => ({}));
    const { symbols = ["META", "QQQ", "SPY"], tf = "1H" } = body;

    console.log(`[oracle-scan-v2] workspace_id=${workspace_id}, symbols=${symbols.join(",")}, tf=${tf}`);

    // Generate signals for each symbol
    const signals: any[] = [];

    for (const symbol of symbols) {
      // Fetch recent candles (last 100 for indicator calculation)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 100 * 60 * 60 * 1000); // ~100 hours back

      const { data: candles } = await supabase.rpc("fetch_candles", {
        _ws: workspace_id,
        _symbol: symbol,
        _tf: tf,
        _from: startTime.toISOString(),
        _to: endTime.toISOString(),
      });

      if (!candles || candles.length < 20) {
        console.log(`[oracle-scan-v2] insufficient candles for ${symbol}`);
        continue;
      }

      // Calculate simple indicators
      const closes = candles.map((c: any) => parseFloat(c.c));
      const volumes = candles.map((c: any) => parseFloat(c.v));

      // EMA crossover signal
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      const trendSignal = ema12 > ema26 ? 1 : -1;
      const trendConfidence = Math.abs(ema12 - ema26) / ema26;

      // Volume surge signal
      const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const currentVolume = volumes[volumes.length - 1];
      const volumeSurge = currentVolume > avgVolume * 1.5 ? 1 : 0;
      const volumeConfidence = Math.min(1, currentVolume / avgVolume / 2);

      // RSI signal (simplified)
      const rsi = calculateRSI(closes, 14);
      const rsiSignal = rsi < 30 ? 1 : rsi > 70 ? -1 : 0;
      const rsiConfidence = rsi < 30 ? (30 - rsi) / 30 : rsi > 70 ? (rsi - 70) / 30 : 0.5;

      // Combined signal
      const combinedValue = (trendSignal + volumeSurge + rsiSignal) / 3;
      const combinedConfidence = (trendConfidence + volumeConfidence + rsiConfidence) / 3;

      signals.push({
        workspace_id,
        symbol,
        tf,
        signal_type: "combined",
        name: `${symbol} ${tf} composite`,
        value: combinedValue,
        confidence: Math.min(0.95, Math.max(0.4, combinedConfidence)),
        ts: new Date().toISOString(),
        payload: {
          trend: { signal: trendSignal, confidence: trendConfidence },
          volume: { surge: volumeSurge, confidence: volumeConfidence },
          rsi: { signal: rsiSignal, confidence: rsiConfidence, value: rsi },
        },
      });
    }

    // Insert signals into oracle_signals
    if (signals.length > 0) {
      const { error: insertError } = await supabase.from("oracle_signals").insert(signals);

      if (insertError) {
        console.error("[oracle-scan-v2] insert error:", insertError);
        return json({ ok: false, error: insertError.message }, 400);
      }

      // Log to repository
      await supabase.from("repository_events").insert({
        workspace_id,
        source: "oracle",
        payload: { event: "signals_generated", count: signals.length },
      });
    }

    return json({
      ok: true,
      inserted: signals.length,
      signals: signals.map((s) => ({ symbol: s.symbol, value: s.value, confidence: s.confidence })),
    });
  } catch (err) {
    console.error("[oracle-scan-v2] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

// Simple indicator calculations

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
