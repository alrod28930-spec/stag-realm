// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
type Bar = { t: string; o: number; h: number; l: number; c: number; v?: number; vw?: number };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Align with your UI's timeframe strings
const TIMEFRAMES = ["1D", "1h", "5m", "1m"] as const;
const DEFAULT_SYMBOLS = ["AAPL", "QQQ", "META", "SPY"];

function sleep(ms: number){ return new Promise(r=>setTimeout(r,ms)); }

const tfMap: Record<string, string> = {
  "1m": "1Min",
  "5m": "5Min",
  "15m": "15Min",
  "1h": "1Hour",
  "1D": "1Day",
};

async function fetchAlpacaBars(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  tf: string,
  lookbackDays = 14,
): Promise<Bar[]> {
  const timeframe = tfMap[tf] ?? "1Day";
  const end = new Date();
  const start = new Date(
    end.getTime() -
      (tf === "1D" ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60 * 24 * lookbackDays),
  );
  const url = new URL(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars`);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("limit", "10000");
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());

  const res = await fetch(url.toString(), {
    headers: { "APCA-API-KEY-ID": apiKey, "APCA-API-SECRET-KEY": apiSecret },
  });
  if (!res.ok) throw new Error(`Alpaca bars ${symbol} ${tf}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json?.bars ?? [];
}

async function upsertCandles(supabase: any, wsId: string, symbol: string, tf: string, bars: Bar[]) {
  if (!bars?.length) return;
  const rows = bars.map(b => ({
    workspace_id: wsId,
    symbol,
    tf,
    ts: b.t,
    o: b.o, h: b.h, l: b.l, c: b.c,
    v: b.v ?? null,
    vwap: b.vw ?? null
  }));
  const { error } = await supabase.from('candles').upsert(rows, { onConflict: 'workspace_id,symbol,tf,ts' });
  if (error) throw error;
}

async function record(supabase: any, wsId: string, actor: string, event_type: string, payload?: any) {
  await supabase.from('recorder_mirror').insert({ workspace_id: wsId, actor, event_type, payload });
}

async function getStoredAlpacaCreds(supabase: any, wsId: string) {
  const { data: link } = await supabase
    .from('connections_brokerages')
    .select('api_key_cipher, api_secret_cipher, nonce')
    .eq('workspace_id', wsId)
    .eq('provider', 'alpaca')
    .eq('status','active')
    .maybeSingle();

  if (link?.api_key_cipher && link?.api_secret_cipher) {
    const dec = await supabase.functions.invoke('decrypt-brokerage-credentials', {
      body: { encrypted: { api_key_cipher: link.api_key_cipher, api_secret_cipher: link.api_secret_cipher, nonce: link.nonce } }
    });
    const cred = dec.data?.credentials ?? {};
    const apiKey = cred.api_key ?? cred.apiKey;
    const apiSecret = cred.secret_key ?? cred.apiSecret;
    if (apiKey && apiSecret) return { apiKey, apiSecret };
  }
  
  const apiKey = Deno.env.get('ALPACA_API_KEY') ?? '';
  const apiSecret = Deno.env.get('ALPACA_SECRET_KEY') ?? '';
  return { apiKey, apiSecret };
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { searchParams } = new URL(req.url);
  const wsId = searchParams.get("ws"); // optional: run for a single workspace

  // Determine target workspaces
  let workspaces: string[] = [];
  if (wsId) {
    workspaces = [wsId];
  } else {
    const { data } = await supabase.from("feature_flags").select("workspace_id").limit(1000);
    workspaces = (data ?? []).map((r: any) => r.workspace_id);
  }
  if (!workspaces.length) return new Response(JSON.stringify({ ok: true, workspaces: 0 }), { headers: { "content-type": "application/json" } });

  for (const ws of workspaces) {
    try {
      // Ensure baseline symbols exist in ref_symbols
      const { data: existing } = await supabase.from("ref_symbols").select("symbol");
      const have = new Set((existing ?? []).map((r: any) => r.symbol));
      const baseline = DEFAULT_SYMBOLS.filter((s) => !have.has(s)).map((s) => ({
        symbol: s,
        exchange: "NASDAQ",
        active: true,
      }));
      if (baseline.length) await supabase.from("ref_symbols").upsert(baseline);

      const { apiKey, apiSecret } = await getStoredAlpacaCreds(supabase, ws);
      if (!apiKey || !apiSecret) {
        await record(supabase, ws, "oracle", "sync.error", { reason: "no_credentials" });
        continue;
      }

      // Choose symbols (positions/watchlist could be added; start with defaults)
      const symbols = DEFAULT_SYMBOLS;

      for (const sym of symbols) {
        // Skip unknown symbols just in case
        const { data: ok } = await supabase.from("ref_symbols").select("symbol").eq("symbol", sym).maybeSingle();
        if (!ok) {
          await record(supabase, ws, "oracle", "sync.warn", { symbol: sym, reason: "unknown_symbol" });
          continue;
        }

        for (const tf of TIMEFRAMES) {
          try {
            const bars = await fetchAlpacaBars(apiKey, apiSecret, sym, tf);
            await upsertCandles(supabase, ws, sym, tf, bars);
            await record(supabase, ws, "oracle", "sync.heartbeat", {
              symbol: sym,
              tf,
              count: bars.length,
              last_ts: bars.at(-1)?.t ?? null,
            });
            await sleep(150); // gentle rate limit
          } catch (e) {
            await record(supabase, ws, "oracle", "sync.error", { symbol: sym, tf, error: String(e) });
          }
        }
      }
    } catch (e) {
      await record(supabase, ws, "oracle", "sync.error", { error: String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
