import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Analyst Auto-Tune
 * Adjusts analyst_hparams from outcomes (win rate, avg RR), within safe clamps
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

    // Baseline params
    const { data: hp } = await supabase
      .from("analyst_hparams")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    const params = hp?.params ?? { w_win: 0.5, w_oracle: 0.5, risk_base: 0.02, risk_cap: 0.03 };

    // Read last 7d performance
    const sinceISO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
    const { data: stats } = await supabase
      .from("bid_user_stats")
      .select("win_rate, avg_rr")
      .eq("workspace_id", workspace_id)
      .gte("last_updated", sinceISO)
      .limit(200);

    if (!stats?.length) return json({ ok: true, tuned: false });

    const wr = stats.reduce((s: number, r: any) => s + (r.win_rate ?? 0), 0) / stats.length;
    const rr = stats.reduce((s: number, r: any) => s + (r.avg_rr ?? 1), 0) / stats.length;

    // Tiny nudges
    const delta = (wr - 0.5) * 0.05;       // ±0.025 typical
    const riskBump = (rr - 1.0) * 0.002;   // tiny nudge around 1.0 RR

    const tuned = {
      w_win: clamp(params.w_win + delta, 0.2, 0.8),
      w_oracle: clamp(1 - (params.w_win + delta), 0.2, 0.8),
      risk_base: clamp(params.risk_base + riskBump, 0.01, 0.03),
      risk_cap: clamp(params.risk_cap, 0.02, 0.05),
    };

    await supabase.from("analyst_hparams").upsert({ workspace_id, params: tuned });

    return json({ ok: true, tuned: true, params: tuned });
  } catch (err) {
    console.error("[analyst-auto-tune] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
