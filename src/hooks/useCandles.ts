/**
 * Resilient candles hook with FSM states (loading → ready | degraded | error)
 * Never crashes - always shows something (skeleton, cached, or error)
 */

import { useState, useEffect } from 'react';
import { getCandles, getCachedCandles } from '@/integrations/supabase/candles';
import type { Candle } from '@/integrations/supabase/candles';

type CandleState = 'loading' | 'ready' | 'degraded' | 'error';

export interface UseCandlesReturn {
  state: CandleState;
  data: Candle[];
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch candles with automatic fallback to cache on error
 */
export function useCandles(
  workspaceId: string,
  symbol: string,
  tf: string
): UseCandlesReturn {
  const [state, setState] = useState<CandleState>('loading');
  const [data, setData] = useState<Candle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!workspaceId || !symbol || !tf) {
      setState('error');
      setError('Missing required parameters');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days back
      
      const candles = await getCandles(
        workspaceId,
        symbol,
        tf,
        from.toISOString(),
        now.toISOString()
      );

      if (candles && candles.length > 0) {
        setData(candles);
        setState('ready');
      } else {
        // No data from server, check cache
        const cached = getCachedCandles(workspaceId, symbol, tf);
        if (cached.length > 0) {
          setData(cached);
          setState('degraded');
          setError('Using cached data');
        } else {
          setData([]);
          setState('error');
          setError('No data available');
        }
      }
    } catch (err) {
      // Fetch failed, use cache
      const cached = getCachedCandles(workspaceId, symbol, tf);
      if (cached.length > 0) {
        setData(cached);
        setState('degraded');
        setError('Network error - using cached data');
      } else {
        setData([]);
        setState('error');
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await fetchData();
    };

    if (mounted) {
      load();
    }

    return () => {
      mounted = false;
    };
  }, [workspaceId, symbol, tf]);

  return {
    state,
    data,
    error,
    refetch: fetchData,
  };
}
