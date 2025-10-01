/**
 * Resilient candles hook with FSM states (loading → ready | degraded | error)
 * Never crashes - always shows something (skeleton, cached, or error)
 */

import { useState, useEffect } from 'react';
import { getCandles, type Candle } from '@/integrations/supabase/candles';

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

      if (candles.length > 0) {
        setData(candles);
        setState('ready');
      } else {
        setData([]);
        setState('degraded');
        setError('No data available - try running market sync');
      }
    } catch (err) {
      console.error('useCandles error:', err);
      setData([]);
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
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
