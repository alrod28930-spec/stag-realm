import { supabase } from "./client";

export interface Candle {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number | null;
  vwap: number | null;
}

export async function getCandles(wsId: string, symbol: string, tf: string, fromISO: string, toISO: string) {
  const ctl = new AbortController(); 
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const { data, error } = await supabase
      .rpc("fetch_candles", { _ws: wsId, _symbol: symbol, _tf: tf, _from: fromISO, _to: toISO })
      // @ts-ignore supported in supabase-js
      .abortSignal(ctl.signal);
    if (error) {
      console.warn("fetch_candles error", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("candles degraded", e);
    return [];
  } finally { 
    clearTimeout(t); 
  }
}
