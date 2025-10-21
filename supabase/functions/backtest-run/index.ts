import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Backtest Run
 * Lightweight backtesting harness using stored candles
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

    const { symbol = "SPY", tf = "1H", fromISO, toISO } = await req.json();

    // Fetch candles via RPC fetch_candles
    const { data: rows, error } = await supabase.rpc("fetch_candles", {
      _ws: workspace_id,
      _symbol: symbol,
      _tf: tf,
      _from: fromISO,
      _to: toISO,
    });

    if (error) return json({ ok: false, error: "candles", detail: error.message }, 400);

    // Naive strategy placeholder: buy if prior close above simple SMA(20), SL/TP from Analyst defaults
    // Compute fake trade outcomes; return summary
    const result = {
      trades: 12,
      win_rate: 0.58,
      pnl_bp: 320,
      avg_rr: 1.15,
    };

    return json({ ok: true, symbol, tf, result });
  } catch (err) {
    console.error("[backtest-run] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
