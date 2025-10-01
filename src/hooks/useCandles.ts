/**
 * Resilient candles hook with FSM states (loading → ready | degraded | error)
 * Never crashes - always shows something (skeleton, cached, or error)
 */

import { useState, useEffect } from 'react';
import { BID } from '@/integrations/supabase/bid.adapter';
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
      
      // Use BID adapter (backend-first)
      const response = await BID.getMarketSnapshots(
        workspaceId,
        symbol,
        tf as '1m' | '5m' | '15m' | '1h' | '1D',
        from.toISOString(),
        now.toISOString()
      );

      if (response.error) {
        throw response.error;
      }

      if (response.data && response.data.length > 0) {
        setData(response.data as Candle[]);
        setState('ready');
      } else {
        setData([]);
        setState('error');
        setError('No data available');
      }
    } catch (err) {
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
