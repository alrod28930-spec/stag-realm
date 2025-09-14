import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

interface DividendData {
  symbol: string;
  adps: number;
  frequency: 'M' | 'Q' | 'S' | 'A';
  growth_rate?: number;
  ex_date?: string;
  pay_date?: string;
}

interface UseDividendDataResult {
  dividendData: DividendData | null;
  isLoading: boolean;
  error: string | null;
  refetch: (symbol: string) => void;
}

export const useDividendData = (initialSymbol?: string): UseDividendDataResult => {
  const [dividendData, setDividendData] = useState<DividendData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const workspaceId = user?.organizationId || '00000000-0000-0000-0000-000000000001';

  const fetchDividendData = async (symbol: string) => {
    if (!symbol || !user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-dividends', {
        body: { 
          symbol: symbol.toUpperCase(),
          workspace_id: workspaceId
        }
      });

      if (fetchError) throw fetchError;

      if (data?.data) {
        setDividendData(data.data);
      } else {
        setDividendData({
          symbol: symbol.toUpperCase(),
          adps: 0,
          frequency: 'Q',
          growth_rate: 0
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching dividend data:', err);
      
      // Set default data on error
      setDividendData({
        symbol: symbol.toUpperCase(),
        adps: 0,
        frequency: 'Q',
        growth_rate: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSymbol) {
      fetchDividendData(initialSymbol);
    }
  }, [initialSymbol, user?.id, workspaceId]);

  return {
    dividendData,
    isLoading,
    error,
    refetch: fetchDividendData
  };
};