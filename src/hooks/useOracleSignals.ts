import { useState, useEffect } from 'react';
import { oracle } from '@/services/oracle';
import type { ProcessedSignal } from '@/types/oracle';

export function useOracleSignals(limit = 20) {
  const [signals, setSignals] = useState<ProcessedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSignals = async () => {
      try {
        setIsLoading(true);
        const data = await oracle.getSignalsFromDb(limit);
        setSignals(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load signals');
        // Fallback to in-memory signals
        const fallbackSignals = oracle.getSignals(limit);
        setSignals(fallbackSignals);
      } finally {
        setIsLoading(false);
      }
    };

    loadSignals();

    // Refresh every 30 seconds
    const interval = setInterval(loadSignals, 30000);
    
    return () => clearInterval(interval);
  }, [limit]);

  return { signals, isLoading, error };
}