/**
 * Hook to fetch oracle signal indicators for chart overlays
 */

import { useState, useEffect } from 'react';
import { BID } from '@/integrations/supabase/bid.adapter';

interface OracleIndicator {
  ts: string;
  name: string;
  value: number | null;
}

export function useOracleIndicators(
  workspaceId: string,
  symbol: string,
  tf: string,
  enabled: boolean = true
) {
  const [indicators, setIndicators] = useState<OracleIndicator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !workspaceId || !symbol) {
      setIndicators([]);
      return;
    }

    const fetchIndicators = async () => {
      setLoading(true);
      try {
        const response = await BID.getOracleSignals(workspaceId, symbol, 100);
        
        if (response.data) {
          // Filter by timeframe and extract indicator data
          const filtered = response.data
            .filter((sig: any) => sig.tf === tf && sig.value !== null)
            .map((sig: any) => ({
              ts: sig.ts,
              name: sig.name,
              value: sig.value,
            }));
          
          setIndicators(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch oracle indicators:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchIndicators, 30000);
    return () => clearInterval(interval);
  }, [workspaceId, symbol, tf, enabled]);

  return { indicators, loading };
}
