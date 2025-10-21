import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Oracle Score - Update oracle_signal_scores with realized outcomes
 * Posts signal performance data to update hit rate and edge metrics
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

    // Parse request
    const body = await req.json();
    const { symbol, tf, regime = "neutral", edge_bp, hit } = body;

    if (!symbol || !tf || edge_bp === undefined || hit === undefined) {
      return json({ ok: false, error: "Missing required fields: symbol, tf, edge_bp, hit" }, 400);
    }

    // Ensure workspace
    const workspace_id = await ensureWorkspace(supabase);

    console.log(`[oracle-score] workspace_id=${workspace_id}, symbol=${symbol}, tf=${tf}, hit=${hit}, edge_bp=${edge_bp}`);

    // Get existing score or create new
    const { data: existing } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("symbol", symbol)
      .eq("tf", tf)
      .eq("regime", regime)
      .limit(1)
      .single();

    let updatedN: number;
    let updatedHitRate: number;
    let updatedAvgEdgeBp: number;

    if (existing) {
      // Update existing record
      updatedN = existing.n + 1;
      const totalHits = existing.hit_rate * existing.n + (hit ? 1 : 0);
      updatedHitRate = totalHits / updatedN;
      const totalEdge = existing.avg_edge_bp * existing.n + edge_bp;
      updatedAvgEdgeBp = totalEdge / updatedN;

      const { error } = await supabase
        .from("oracle_signal_scores")
        .update({
          n: updatedN,
          hit_rate: updatedHitRate,
          avg_edge_bp: updatedAvgEdgeBp,
          last_updated: new Date().toISOString(),
        })
        .eq("workspace_id", workspace_id)
        .eq("symbol", symbol)
        .eq("tf", tf)
        .eq("regime", regime);

      if (error) {
        console.error("[oracle-score] update error:", error);
        return json({ ok: false, error: error.message }, 400);
      }
    } else {
      // Insert new record
      updatedN = 1;
      updatedHitRate = hit ? 1 : 0;
      updatedAvgEdgeBp = edge_bp;

      const { error } = await supabase
        .from("oracle_signal_scores")
        .insert({
          workspace_id,
          symbol,
          tf,
          regime,
          n: updatedN,
          hit_rate: updatedHitRate,
          avg_edge_bp: updatedAvgEdgeBp,
          last_updated: new Date().toISOString(),
        });

      if (error) {
        console.error("[oracle-score] insert error:", error);
        return json({ ok: false, error: error.message }, 400);
      }
    }

    return json({
      ok: true,
      symbol,
      tf,
      regime,
      updated: {
        n: updatedN,
        hit_rate: updatedHitRate,
        avg_edge_bp: updatedAvgEdgeBp,
      },
    });
  } catch (err) {
    console.error("[oracle-score] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
