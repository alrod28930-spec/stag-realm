import { supabase } from "./client";
import { setCachedCandles, getCachedCandles } from '@/utils/chartDegradedMode';

export interface Candle {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number | null;
  vwap: number | null;
}

/**
 * Fetch candles with degraded mode support
 * Returns cached data if fetch fails or times out (prevents chart flashing)
 */
export async function getCandles(wsId: string, symbol: string, tf: string, fromISO: string, toISO: string) {
  const ctl = new AbortController(); 
  const t = setTimeout(() => ctl.abort(), 8000); // Increased to 8s for better reliability
  
  try {
    const { data, error } = await supabase
      .rpc("fetch_candles", { _ws: wsId, _symbol: symbol, _tf: tf, _from: fromISO, _to: toISO })
      // @ts-ignore supported in supabase-js
      .abortSignal(ctl.signal);
    
    if (error) {
      console.warn(`⚠️ fetch_candles error for ${symbol}:${tf}:`, error);
      // Return cached data instead of empty array
      const cached = getCachedCandles(wsId, symbol, tf);
      if (cached) {
        console.log(`📦 Using cached candles for ${symbol}:${tf} (${cached.length} bars)`);
        return cached;
      }
      return [];
    }
    
    // Cache successful fetch
    if (data && data.length > 0) {
      setCachedCandles(wsId, symbol, tf, data);
      console.log(`✅ Fetched and cached ${data.length} candles for ${symbol}:${tf}`);
    }
    
    return data ?? [];
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    console.warn(`⚠️ candles ${isTimeout ? 'timeout' : 'error'} for ${symbol}:${tf}:`, e);
    
    // Always try to return cached data on error/timeout
    const cached = getCachedCandles(wsId, symbol, tf);
    if (cached) {
      console.log(`📦 Using cached candles for ${symbol}:${tf} (${cached.length} bars) - ${isTimeout ? 'timeout' : 'error'} fallback`);
      return cached;
    }
    
    return [];
  } finally { 
    clearTimeout(t); 
  }
}
