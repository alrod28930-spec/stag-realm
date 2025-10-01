/**
 * Candles adapter - resilient data fetching with cache fallback
 */

import { supabase } from './client';

export interface Candle {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vwap?: number;
}

// In-memory cache for last-good candles
const candleCache = new Map<string, Candle[]>();

function getCacheKey(wsId: string, symbol: string, tf: string): string {
  return `${wsId}:${symbol}:${tf}`;
}

export function getCachedCandles(wsId: string, symbol: string, tf: string): Candle[] {
  const key = getCacheKey(wsId, symbol, tf);
  return candleCache.get(key) || [];
}

function setCachedCandles(wsId: string, symbol: string, tf: string, candles: Candle[]): void {
  const key = getCacheKey(wsId, symbol, tf);
  if (candles.length > 0) {
    candleCache.set(key, candles);
  }
}

export async function getCandles(
  wsId: string, 
  symbol: string, 
  tf: string, 
  fromISO: string, 
  toISO: string
): Promise<Candle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const { data, error } = await supabase
      .rpc('fetch_candles', {
        _ws: wsId,
        _symbol: symbol,
        _tf: tf,
        _from: fromISO,
        _to: toISO,
      })
      .abortSignal(controller.signal);

    if (error) throw error;
    
    const candles = (data || []) as Candle[];
    if (candles.length > 0) {
      setCachedCandles(wsId, symbol, tf, candles);
    }
    return candles;
  } catch (e) {
    console.warn('⚠️ Candles fetch degraded, using cache:', e);
    return getCachedCandles(wsId, symbol, tf);
  } finally {
    clearTimeout(timeout);
  }
}

export function clearCandleCache(wsId?: string, symbol?: string, tf?: string): void {
  if (wsId && symbol && tf) {
    const key = getCacheKey(wsId, symbol, tf);
    candleCache.delete(key);
  } else {
    candleCache.clear();
  }
}
