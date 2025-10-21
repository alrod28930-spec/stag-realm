import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";
import { ewma } from "../_shared/predictive.ts";

const FN = "oracle-predictive-merge";

/**
 * Oracle Predictive Merge - Phase VI
 * Fuse ensemble price momentum, sentiment, and anomaly severity → oracle_predictive
 */

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";

  try {
    workspace_id = await ensureWorkspace(supabase);
    
    const body = await req.json().catch(() => ({}));
    const { symbols = ["SPY", "QQQ", "META"], tf = "1H" } = body;

    const out: any[] = [];

    for (const symbol of symbols) {
      // Price momentum proxy: use oracle_signals 'ensemble' avg over recent window
      const { data: priceSig } = await supabase
        .from("oracle_signals")
        .select("value, confidence, ts")
        .eq("workspace_id", workspace_id)
        .eq("signal_type", "ensemble")
        .eq("tf", tf)
        .eq("symbol", symbol)
        .order("ts", { ascending: false })
        .limit(20);

      let momentum: any = undefined;
      for (const row of priceSig ?? []) {
        momentum = ewma(momentum, Number(row.value), 0.2);
      }
      const price_mom = Math.max(0, Math.min(1, Number((momentum ?? 0.5).toFixed(3))));

      // Sentiment 24h mean
      const { data: news } = await supabase
        .from("oracle_news")
        .select("sentiment")
        .eq("workspace_id", workspace_id)
        .eq("symbol", symbol)
        .gte("ts", new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString());

      const sentiment = Math.max(
        -1,
        Math.min(
          1,
          (news ?? []).reduce((a: any, r: any) => a + Number(r.sentiment), 0) /
            Math.max(1, (news ?? []).length)
        )
      );

      // Latest anomaly severity last 6h
      const { data: anom } = await supabase
        .from("oracle_anomalies")
        .select("severity")
        .eq("workspace_id", workspace_id)
        .eq("symbol", symbol)
        .eq("tf", tf)
        .gte("observed_at", new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString())
        .order("observed_at", { ascending: false })
        .limit(1);

      const anomaly = Number((anom?.[0]?.severity ?? 0).toFixed(3));

      // Fused score: price momentum pulls up, positive sentiment helps, anomaly penalizes
      const score = Math.max(
        0,
        Math.min(1, 0.6 * price_mom + 0.3 * ((sentiment + 1) / 2) - 0.5 * anomaly)
      );

      out.push({
        workspace_id,
        symbol,
        tf,
        score: Number(score.toFixed(3)),
        sentiment: Number(sentiment.toFixed(3)),
        anomaly: Number(anomaly.toFixed(3)),
        price_momentum: price_mom,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert all
    for (const row of out) {
      await supabase.from("oracle_predictive").upsert(row);
    }

    console.log(`[predictive-merge] Updated ${out.length} predictive rows`);
    await repoEvent(supabase, workspace_id, FN, { ok: true, updated: out.length, tf, symbols });
    return json({ ok: true, updated: out.length, data: out });
  } catch (e) {
    console.error("[predictive-merge] Error:", e);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
