import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "market-data-sync";
const BASE = {
  paper: "https://data.alpaca.markets",
  live: "https://data.alpaca.markets"
};

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";
  
  try {
    console.log('🔐 Starting market-data-sync with auth check');
    workspace_id = await ensureWorkspace(supabase);
    console.log(`✅ Workspace resolved: ${workspace_id}`);
    
    const body = await req.json().catch(() => ({}));
    const symbols = (body.symbols ?? ["SPY", "QQQ"]).slice(0, 10);
    const tf = body.tf ?? "1H";
    
    const now = new Date();
    const fromISO = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10).toISOString();

    console.log(`📊 Syncing ${symbols.length} symbols, tf=${tf}`);

    // Get credentials
    const dec = await fetch(
      new URL(req.url).origin + "/functions/v1/decrypt-brokerage-credentials",
      { method: "POST", headers: req.headers }
    ).then(r => r.json());
    
    if (!dec?.ok) {
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "decrypt_failed" });
      return json({ ok: false, error: "decrypt_failed" });
    }

    const url = BASE[(dec.mode ?? "paper") as "paper" | "live"];

    let inserted = 0;
    let warned = 0;
    
    for (const symbol of symbols) {
      const u = new URL(`${url}/v2/stocks/${encodeURIComponent(symbol)}/bars`);
      u.searchParams.set("timeframe", tf);
      u.searchParams.set("start", fromISO);
      
      const r = await fetch(u.toString(), {
        headers: {
          "APCA-API-KEY-ID": dec.apiKey,
          "APCA-API-SECRET-KEY": dec.secret
        }
      });
      
      if (!r.ok) {
        warned++;
        console.warn(`⚠️ Failed to fetch ${symbol}: ${r.status}`);
        continue;
      }
      
      const j = await r.json();
      const bars = j?.bars ?? [];
      
      if (!bars.length) {
        warned++;
        console.warn(`⚠️ No bars for ${symbol}`);
        continue;
      }

      const rows = bars.map((b: any) => ({
        workspace_id,
        symbol,
        tf,
        ts: b.t,
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        v: b.v,
        vwap: b.vw ?? null
      }));
      
      const { error } = await supabase
        .from("candles")
        .upsert(rows, { onConflict: "workspace_id,symbol,tf,ts" });
      
      if (!error) {
        inserted += rows.length;
      } else {
        console.error(`❌ Upsert error for ${symbol}:`, error);
      }
    }

    await repoEvent(supabase, workspace_id, FN, {
      ok: true,
      inserted,
      warned,
      tf,
      n: symbols.length
    });
    
    return json({ ok: true, inserted, warned, tf, symbols });
  } catch (e) {
    console.error('💥 market-data-sync error:', e);
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
