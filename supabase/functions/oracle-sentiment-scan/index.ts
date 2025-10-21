import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "oracle-sentiment-scan";

/**
 * Oracle Sentiment Scan - Phase VI
 * Fetch headlines, score sentiment, store into oracle_news and oracle_signals
 */

const PROVIDER = Deno.env.get("NEWS_PROVIDER") ?? "mock"; // 'mock'|'finnhub'|'newscatcher'
const API_KEY = Deno.env.get("NEWS_API_KEY") ?? "";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";

  try {
    workspace_id = await ensureWorkspace(supabase);
    
    const body = await req.json().catch(() => ({}));
    const { symbols = ["SPY", "QQQ", "META"] } = body;

    const rows: any[] = [];
    for (const symbol of symbols) {
      const items = await fetchHeadlines(symbol);
      for (const it of items) {
        const s = scoreSentiment(it.headline);
        rows.push({
          workspace_id,
          symbol,
          headline: it.headline,
          source: it.source,
          ts: it.ts,
          sentiment: Number(s.toFixed(3)),
          confidence: 0.7,
        });
      }
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from("oracle_news").insert(rows);
      if (insertError) {
        console.error("[sentiment-scan] Insert error:", insertError);
      }
    }

    // Aggregate per symbol (24h) and write to oracle_signals
    for (const symbol of symbols) {
      const { data } = await supabase
        .from("oracle_news")
        .select("sentiment, ts")
        .eq("workspace_id", workspace_id)
        .eq("symbol", symbol)
        .gte("ts", new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString());

      const mean = avg((data ?? []).map((d: any) => Number(d.sentiment)));

      if (!Number.isNaN(mean)) {
        await supabase.from("oracle_signals").insert({
          workspace_id,
          symbol,
          tf: "1D",
          signal_type: "sentiment",
          name: "sentiment_24h",
          value: mean,
          confidence: Math.min(1, Math.abs(mean)),
          direction: mean > 0.1 ? 1 : mean < -0.1 ? -1 : 0,
          strength: Math.abs(mean),
        });
      }
    }

    console.log(`[sentiment-scan] Inserted ${rows.length} news items`);
    await repoEvent(supabase, workspace_id, FN, { ok: true, inserted: rows.length });
    return json({ ok: true, inserted: rows.length });
  } catch (e) {
    console.error("[sentiment-scan] Error:", e);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});

/* Helpers */
function scoreSentiment(text: string): number {
  const t = text.toLowerCase();
  const pos = ["beats", "surge", "record", "upgrade", "profit", "strong", "soars", "rally"];
  const neg = ["miss", "downgrade", "lawsuit", "fraud", "weak", "plunge", "selloff", "warning"];
  let s = 0;
  for (const w of pos) if (t.includes(w)) s += 1;
  for (const w of neg) if (t.includes(w)) s -= 1;
  return Math.max(-1, Math.min(1, s / 3));
}

function avg(a: number[]): number {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

async function fetchHeadlines(symbol: string) {
  if (PROVIDER === "mock" || !API_KEY) {
    return [
      {
        headline: `${symbol} sees profit surge amid upbeat outlook`,
        source: "mock",
        ts: new Date().toISOString(),
      },
    ];
  }
  // Optional: Add provider-specific fetch with API_KEY here
  return [];
}
