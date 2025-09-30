/**
 * Candles adapter with timeout, retry, and cached fallback
 * Implements resilient data fetching for charts
 */

import { supabase } from './client';
import { retry, createAbortController, isRetryableError } from '@/utils/retry';
import { logService } from '@/services/logging';

export interface Candle {
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vwap?: number;
}

// In-memory cache for last-good candles (per workspace/symbol/tf)
const candleCache = new Map<string, Candle[]>();

function getCacheKey(workspaceId: string, symbol: string, tf: string): string {
  return `${workspaceId}:${symbol}:${tf}`;
}

/**
 * Get cached candles for a symbol (fallback when fetch fails)
 */
export function getCachedCandles(
  workspaceId: string,
  symbol: string,
  tf: string
): Candle[] {
  const key = getCacheKey(workspaceId, symbol, tf);
  return candleCache.get(key) || [];
}

/**
 * Store candles in cache
 */
function setCachedCandles(
  workspaceId: string,
  symbol: string,
  tf: string,
  candles: Candle[]
): void {
  const key = getCacheKey(workspaceId, symbol, tf);
  if (candles.length > 0) {
    candleCache.set(key, candles);
  }
}

/**
 * Fetch candles with timeout, retry, and fallback to cache
 */
export async function getCandles(
  workspaceId: string,
  symbol: string,
  tf: string,
  fromISO: string,
  toISO: string
): Promise<Candle[]> {
  const controller = createAbortController(8000); // 8s timeout

  try {
    const result = await retry(
      async () => {
        const { data, error } = await supabase
          .rpc('fetch_candles', {
            _ws: workspaceId,
            _symbol: symbol,
            _tf: tf,
            _from: fromISO,
            _to: toISO,
          })
          .abortSignal(controller.signal);

        if (error) throw error;
        return data || [];
      },
      {
        attempts: 2,
        baseDelay: 400,
        maxDelay: 2000,
        shouldRetry: isRetryableError,
        onRetry: (attempt, error) => {
          logService.log('warn', `Candles fetch retry ${attempt}`, {
            symbol,
            tf,
            error: error.message,
          });
        },
      }
    );

    // Cache successful result
    if (result && result.length > 0) {
      setCachedCandles(workspaceId, symbol, tf, result);
    }

    return result;
  } catch (error) {
    logService.log('error', 'Candles fetch failed, using cache', {
      symbol,
      tf,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback to cached data
    return getCachedCandles(workspaceId, symbol, tf);
  } finally {
    try {
      controller.abort();
    } catch {}
  }
}

/**
 * Clear cache for a specific symbol or all cache
 */
export function clearCandleCache(
  workspaceId?: string,
  symbol?: string,
  tf?: string
): void {
  if (workspaceId && symbol && tf) {
    const key = getCacheKey(workspaceId, symbol, tf);
    candleCache.delete(key);
  } else {
    candleCache.clear();
  }
}
