/**
 * Chart degraded mode utilities
 * Prevents charts from flashing empty when data is temporarily unavailable
 */

interface CandleData {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

// In-memory cache for last good candle data
const candleCache = new Map<string, CandleData[]>();

/**
 * Cache key generator
 */
export function getCacheKey(wsId: string, symbol: string, tf: string): string {
  return `${wsId}:${symbol}:${tf}`;
}

/**
 * Store candles in cache
 */
export function setCachedCandles(wsId: string, symbol: string, tf: string, candles: CandleData[]): void {
  if (candles && candles.length > 0) {
    const key = getCacheKey(wsId, symbol, tf);
    candleCache.set(key, candles);
    console.log(`📦 Cached ${candles.length} candles for ${key}`);
  }
}

/**
 * Retrieve cached candles
 */
export function getCachedCandles(wsId: string, symbol: string, tf: string): CandleData[] | null {
  const key = getCacheKey(wsId, symbol, tf);
  const cached = candleCache.get(key);
  
  if (cached) {
    console.log(`✅ Using cached candles for ${key} (${cached.length} bars)`);
  }
  
  return cached || null;
}

/**
 * Clear cache for specific key or all
 */
export function clearCandleCache(wsId?: string, symbol?: string, tf?: string): void {
  if (wsId && symbol && tf) {
    const key = getCacheKey(wsId, symbol, tf);
    candleCache.delete(key);
    console.log(`🗑️ Cleared cache for ${key}`);
  } else {
    candleCache.clear();
    console.log('🗑️ Cleared all candle cache');
  }
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): { size: number; keys: string[] } {
  return {
    size: candleCache.size,
    keys: Array.from(candleCache.keys())
  };
}
