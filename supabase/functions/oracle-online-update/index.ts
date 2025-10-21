import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Oracle Online Update
 * Lightweight adaptive scoring using recent outcomes
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

    const sinceISO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(); // last 48h
    
    // Pull fills & matched signals
    const { data: fills } = await supabase
      .from("bid_learning_events")
      .select("symbol, tf, pnl, ts")
      .eq("workspace_id", workspace_id)
      .eq("event_type", "order.filled")
      .gte("ts", sinceISO);

    if (!fills?.length) return json({ ok: true, updated: 0 });

    let updated = 0;
    for (const f of fills) {
      // Naive mapping
      const hit = (f.pnl ?? 0) > 0;
      const edge_bp = Math.round((f.pnl ?? 0) * 10000);

      const { data: row } = await supabase
        .from("oracle_signal_scores")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("symbol", f.symbol)
        .eq("tf", f.tf)
        .eq("regime", "trend")
        .single();

      const n = (row?.n ?? 0) + 1;
      const hit_rate = ((row?.hit_rate ?? 0) * (n - 1) + (hit ? 1 : 0)) / n;
      const avg_edge_bp = ((row?.avg_edge_bp ?? 0) * (n - 1) + edge_bp) / n;

      await supabase.from("oracle_signal_scores").upsert({
        workspace_id,
        symbol: f.symbol,
        tf: f.tf,
        regime: "trend",
        n,
        hit_rate,
        avg_edge_bp,
        last_updated: new Date().toISOString(),
      });
      updated++;
    }

    return json({ ok: true, updated });
  } catch (err) {
    console.error("[oracle-online-update] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
