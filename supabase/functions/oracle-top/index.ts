import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Oracle Top - Get top performing symbols by hit rate and edge
 * Returns ranked symbols from oracle_signal_scores
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
    const { tf = "1H", limit = 20, min_n = 10 } = body;

    // Ensure workspace
    const workspace_id = await ensureWorkspace(supabase);

    console.log(`[oracle-top] workspace_id=${workspace_id}, tf=${tf}, limit=${limit}`);

    // Query oracle_signal_scores
    const { data, error } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("tf", tf)
      .gte("n", min_n) // Require minimum sample size
      .order("hit_rate", { ascending: false })
      .order("avg_edge_bp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[oracle-top] query error:", error);
      return json({ ok: false, error: error.message }, 400);
    }

    // Calculate composite score: hit_rate * avg_edge_bp
    const ranked = (data || [])
      .map((item) => ({
        ...item,
        composite_score: item.hit_rate * item.avg_edge_bp,
      }))
      .sort((a, b) => b.composite_score - a.composite_score);

    return json({
      ok: true,
      tf,
      top_symbols: ranked,
      count: ranked.length,
    });
  } catch (err) {
    console.error("[oracle-top] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
