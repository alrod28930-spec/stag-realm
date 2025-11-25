// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
type Bar = { t: string; o: number; h: number; l: number; c: number; v?: number; vw?: number };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_SYMBOLS = ['AAPL','QQQ','META','SPY'];
const TIMEFRAMES = ['1D','1h','5m'];

function sleep(ms: number){ return new Promise(r=>setTimeout(r,ms)); }

async function fetchAlpacaBars(apiKey: string, apiSecret: string, symbol: string, tf: string, limit = 1000): Promise<Bar[]> {
  const tfMap: Record<string,string> = { '1m':'1Min','5m':'5Min','15m':'15Min','1h':'1Hour','1D':'1Day' };
  const timeframe = tfMap[tf] ?? '1Day';
  const end = new Date();
  const start = new Date(end.getTime() - (tf === '1D' ? 1000*60*60*24*365 : 1000*60*60*24*14));
  const url = new URL(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars`);
  url.searchParams.set('timeframe', timeframe);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const res = await fetch(url.toString(), {
    headers: { 'APCA-API-KEY-ID': apiKey, 'APCA-API-SECRET-KEY': apiSecret }
  });
  if (!res.ok) throw new Error(`Alpaca bars ${symbol} ${tf}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const bars: Bar[] = json?.bars ?? [];
  return bars;
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
  const wsId = searchParams.get('ws');
  let workspaces: { id: string }[] = [];

  if (wsId) {
    workspaces = [{ id: wsId }];
  } else {
    const { data } = await supabase
      .from('feature_flags')
      .select('workspace_id')
      .limit(1000);
    workspaces = (data ?? []).map((r: any) => ({ id: r.workspace_id }));
  }

  for (const ws of workspaces) {
    try {
      const { data: have } = await supabase.from('ref_symbols').select('symbol');
      const haveSet = new Set((have ?? []).map((r: any) => r.symbol));
      const symbols = DEFAULT_SYMBOLS.filter(s => haveSet.has(s));
      if (!symbols.length) {
        await supabase.from('ref_symbols').upsert(DEFAULT_SYMBOLS.map(s => ({ symbol: s, exchange: 'NASDAQ', active: true })));
      }

      const { apiKey, apiSecret } = await getStoredAlpacaCreds(supabase, ws.id);
      if (!apiKey || !apiSecret) {
        await record(supabase, ws.id, 'oracle', 'sync.error', { reason: 'no_credentials' });
        continue;
      }

      for (const sym of (symbols.length ? symbols : DEFAULT_SYMBOLS)) {
        const { data: ok } = await supabase.from('ref_symbols').select('symbol').eq('symbol', sym).maybeSingle();
        if (!ok) {
          await record(supabase, ws.id, 'oracle', 'sync.warn', { reason: 'unknown_symbol', symbol: sym });
          continue;
        }

        for (const tf of TIMEFRAMES) {
          try {
            const bars = await fetchAlpacaBars(apiKey, apiSecret, sym, tf);
            await upsertCandles(supabase, ws.id, sym, tf, bars);
            await record(supabase, ws.id, 'oracle', 'sync.heartbeat', {
              symbol: sym, tf, count: bars.length, last_ts: bars.at(-1)?.t
            });
            await sleep(150);
          } catch (e) {
            await record(supabase, ws.id, 'oracle', 'sync.error', { symbol: sym, tf, error: String(e) });
          }
        }
      }
    } catch (e) {
      await record(supabase, ws.id, 'oracle', 'sync.error', { error: String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
});
