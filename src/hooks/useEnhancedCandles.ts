/**
 * Enhanced candles hook with LRU cache, debouncing, degraded mode, and staleness detection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { BID } from '@/integrations/supabase/bid.adapter';
import type { Candle } from '@/integrations/supabase/candles';

type CandleState = 'loading' | 'ready' | 'degraded' | 'error';

interface CacheEntry {
  data: Candle[];
  timestamp: number;
  hash: string;
}

export interface UseEnhancedCandlesReturn {
  state: CandleState;
  data: Candle[];
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

// LRU cache (max 50 entries)
const candleCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 50;

function getCacheKey(workspaceId: string, symbol: string, tf: string): string {
  return `${workspaceId}:${symbol}:${tf}`;
}

function getWindowedRange(tf: string): { days: number } {
  switch (tf) {
    case '1m': case '5m': return { days: 7 };
    case '15m': case '1h': return { days: 90 };
    case '1D': return { days: 730 }; // 2 years
    default: return { days: 30 };
  }
}

function pruneCache() {
  if (candleCache.size > MAX_CACHE_SIZE) {
    const oldest = Array.from(candleCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
    if (oldest) candleCache.delete(oldest[0]);
  }
}

function computeHash(data: Candle[]): string {
  if (!data.length) return 'empty';
  const first = data[0];
  const last = data[data.length - 1];
  return `${first.ts}-${last.ts}-${data.length}`;
}

export function useEnhancedCandles(
  workspaceId: string,
  symbol: string,
  tf: string
): UseEnhancedCandlesReturn {
  const [state, setState] = useState<CandleState>('loading');
  const [data, setData] = useState<Candle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!workspaceId || !symbol || !tf) {
      setState('error');
      setError('Missing required parameters');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const cacheKey = getCacheKey(workspaceId, symbol, tf);
    const cached = candleCache.get(cacheKey);

    // Show cached data immediately in degraded mode
    if (cached) {
      setData(cached.data);
      setState('degraded');
      setLastUpdated(new Date(cached.timestamp));
    } else {
      setState('loading');
    }

    setError(null);

    try {
      const { days } = getWindowedRange(tf);
      const now = new Date();
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const response = await BID.getMarketSnapshots(
        workspaceId,
        symbol,
        tf as '1m' | '5m' | '15m' | '1h' | '1D',
        from.toISOString(),
        now.toISOString()
      );

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) return;

      if (response.error) {
        throw response.error;
      }

      if (response.data && response.data.length > 0) {
        const candles = response.data as Candle[];
        const hash = computeHash(candles);

        // Only update if data changed
        if (!cached || cached.hash !== hash) {
          setData(candles);
          setState('ready');
          const timestamp = Date.now();
          setLastUpdated(new Date(timestamp));

          // Update cache
          candleCache.set(cacheKey, { data: candles, timestamp, hash });
          pruneCache();
        } else {
          setState('ready');
        }
      } else {
        // No data but no error - show cached if available
        if (cached) {
          setState('degraded');
        } else {
          setState('error');
          setError('No data available');
        }
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return;

      // On error, stay in degraded mode if we have cache
      if (cached) {
        setState('degraded');
        setError('Using cached data');
      } else {
        setState('error');
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      }
    }
  }, [workspaceId, symbol, tf]);

  // Debounced fetch
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchData();
    }, 250);
  }, [fetchData]);

  useEffect(() => {
    debouncedFetch();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [workspaceId, symbol, tf]);

  return {
    state,
    data,
    error,
    lastUpdated,
    refetch: fetchData,
  };
}
