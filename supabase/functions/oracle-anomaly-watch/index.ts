import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";
import { zscore, norm01 } from "../_shared/predictive.ts";

const FN = "oracle-anomaly-watch";

/**
 * Oracle Anomaly Watch - Phase VI
 * Detects volatility/volume/z-score anomalies from recent candles
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

    const now = new Date();
    const fromISO = new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(); // 48h
    const anoms: any[] = [];

    for (const symbol of symbols) {
      // Pull recent candles using RPC
      const { data, error } = await supabase.rpc("fetch_candles", {
        _ws: workspace_id,
        _symbol: symbol,
        _tf: tf,
        _from: fromISO,
        _to: now.toISOString(),
      });

      if (error || !data?.length) {
        console.log(`[anomaly-watch] No data for ${symbol}: ${error?.message}`);
        continue;
      }

      // Calculate basic metrics
      const closes = data.map((r: any) => Number(r.c));
      const vols = data.map((r: any) => Number(r.v) || 0);
      const mean = avg(closes);
      const sd = std(closes);
      const vmean = avg(vols);
      const vsd = std(vols);

      const lastC = closes[closes.length - 1];
      const lastV = vols[vols.length - 1];

      const z = Math.abs(zscore(lastC, mean, sd)); // price z
      const zv = Math.abs(zscore(lastV, vmean, vsd)); // volume z

      // Severity 0..1 from z (cap at 4σ)
      const sev = Math.max(norm01(z, 2, 4), norm01(zv, 2, 4));

      if (sev >= 0.25) {
        anoms.push({
          workspace_id,
          symbol,
          tf,
          kind: z >= zv ? "zscore" : "vol_spike",
          severity: Number(sev.toFixed(3)),
          observed_at: new Date().toISOString(),
          meta: { z: z.toFixed(2), zv: zv.toFixed(2), mean: mean.toFixed(2), sd: sd.toFixed(2) },
        });
      }
    }

    if (anoms.length) {
      const { error: insertError } = await supabase.from("oracle_anomalies").insert(anoms);
      if (insertError) {
        console.error("[anomaly-watch] Insert error:", insertError);
      }
    }

    console.log(`[anomaly-watch] Detected ${anoms.length} anomalies`);
    await repoEvent(supabase, workspace_id, FN, { ok: true, inserted: anoms.length });
    return json({ ok: true, inserted: anoms.length, anomalies: anoms });
  } catch (e) {
    console.error("[anomaly-watch] Error:", e);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});

/* Utils */
function avg(a: number[]): number {
  return a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
}

function std(a: number[]): number {
  const m = avg(a);
  return Math.sqrt(avg(a.map((x) => (x - m) ** 2)));
}
