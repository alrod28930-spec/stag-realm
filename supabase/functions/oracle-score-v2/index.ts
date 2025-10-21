import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Oracle Score v2 - Update Performance Metrics
 * Posts realized outcomes to update oracle_signal_scores
 * Tracks hit rate and edge by symbol/tf/regime
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

    const body = await req.json();
    const { symbol, tf, regime = "neutral", edge_bp = 0, hit = false } = body;

    if (!symbol || !tf || edge_bp === undefined || hit === undefined) {
      return json(
        { ok: false, error: "Missing required fields: symbol, tf, edge_bp, hit" },
        400
      );
    }

    console.log(`[oracle-score-v2] workspace_id=${workspace_id}, symbol=${symbol}, tf=${tf}, hit=${hit}, edge_bp=${edge_bp}`);

    // Get existing score
    const { data: existing } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("symbol", symbol)
      .eq("tf", tf)
      .eq("regime", regime)
      .single();

    // Calculate new values
    const n = (existing?.n ?? 0) + 1;
    const prevHitRate = existing?.hit_rate ?? 0;
    const prevAvgEdge = existing?.avg_edge_bp ?? 0;

    const hit_rate = (prevHitRate * (n - 1) + (hit ? 1 : 0)) / n;
    const avg_edge_bp = (prevAvgEdge * (n - 1) + edge_bp) / n;

    // Upsert
    const { error: upsertError } = await supabase
      .from("oracle_signal_scores")
      .upsert({
        workspace_id,
        symbol,
        tf,
        regime,
        n,
        hit_rate,
        avg_edge_bp,
        last_updated: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("[oracle-score-v2] upsert error:", upsertError);
      return json({ ok: false, error: upsertError.message }, 400);
    }

    // Log to repository
    await supabase.from("repository_events").insert({
      workspace_id,
      source: "oracle",
      payload: {
        event: "score_updated",
        symbol,
        tf,
        regime,
        n,
        hit_rate,
        avg_edge_bp,
      },
    });

    return json({
      ok: true,
      symbol,
      tf,
      regime,
      updated: { n, hit_rate, avg_edge_bp },
    });
  } catch (err) {
    console.error("[oracle-score-v2] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
