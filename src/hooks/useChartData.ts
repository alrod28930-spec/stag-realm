import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCandles } from './useCandles';
import { useSubscriptionAccess } from './useSubscriptionAccess';
import { getCurrentUserWorkspace } from '@/utils/auth';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  time: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  rsi14?: number;
  macd?: number;
  bb_upper?: number;
  bb_lower?: number;
  vwap?: number;
  atr14?: number;
}

export interface OracleSignal {
  id: string;
  time: number;
  type: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  summary: string;
}

const DEMO_CANDLES: CandleData[] = [
  { time: Date.now() - 86400000 * 30, open: 150, high: 155, low: 148, close: 153, volume: 1000000 },
  { time: Date.now() - 86400000 * 29, open: 153, high: 158, low: 151, close: 156, volume: 1200000 },
  { time: Date.now() - 86400000 * 28, open: 156, high: 160, low: 154, close: 159, volume: 950000 },
  { time: Date.now() - 86400000 * 27, open: 159, high: 162, low: 157, close: 160, volume: 1100000 },
  { time: Date.now() - 86400000 * 26, open: 160, high: 165, low: 158, close: 163, volume: 1300000 },
];

const DEMO_INDICATORS: IndicatorData[] = [
  { time: Date.now() - 86400000 * 30, sma20: 152, ema20: 151, rsi14: 55, vwap: 151.5 },
  { time: Date.now() - 86400000 * 29, sma20: 153, ema20: 152, rsi14: 58, vwap: 152.2 },
  { time: Date.now() - 86400000 * 28, sma20: 154, ema20: 153, rsi14: 62, vwap: 153.1 },
  { time: Date.now() - 86400000 * 27, sma20: 155, ema20: 154, rsi14: 65, vwap: 154.0 },
  { time: Date.now() - 86400000 * 26, sma20: 156, ema20: 155, rsi14: 68, vwap: 154.8 },
];

const DEMO_SIGNALS: OracleSignal[] = [
  {
    id: '1',
    time: Date.now() - 86400000 * 25,
    type: 'bullish',
    strength: 0.8,
    summary: 'Strong momentum breakout detected'
  },
  {
    id: '2', 
    time: Date.now() - 86400000 * 15,
    type: 'bearish',
    strength: 0.6,
    summary: 'Resistance level reached'
  }
];

export const useChartData = (symbol: string, timeframe: string = '1D') => {
  const [indicatorData, setIndicatorData] = useState<IndicatorData[]>([]);
  const [oracleSignals, setOracleSignals] = useState<OracleSignal[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  
  const { subscriptionStatus } = useSubscriptionAccess();
  
  // Use resilient candles hook
  const { state: candleState, data: rawCandles, error: candleError } = useCandles(
    workspaceId,
    symbol,
    timeframe
  );

  // Transform raw candles to CandleData format
  const candleData: CandleData[] = rawCandles.map(c => ({
    time: new Date(c.ts).getTime(),
    open: Number(c.o),
    high: Number(c.h),
    low: Number(c.l),
    close: Number(c.c),
    volume: Number(c.v),
  }));

  const loading = candleState === 'loading';
  const error = candleError;

  // Get workspace ID on mount
  useEffect(() => {
    getCurrentUserWorkspace().then(id => {
      if (id) setWorkspaceId(id);
    });
  }, []);

  // Fetch oracle signals and compute indicators
  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        if (subscriptionStatus.isDemo) {
          setIndicatorData(DEMO_INDICATORS);
          setOracleSignals(DEMO_SIGNALS);
          return;
        }

        if (!workspaceId || rawCandles.length === 0) return;

        const signalsResponse = await supabase
          .from('oracle_signals')
          .select('id, ts, direction, strength, summary')
          .eq('workspace_id', workspaceId)
          .eq('symbol', symbol)
          .order('ts', { ascending: false })
          .limit(50);

        if (signalsResponse.error) throw signalsResponse.error;

        // Compute client-side indicators from candle data
        const closes: number[] = [];
        const vols: number[] = [];
        let cumPV = 0;
        let cumV = 0;
        const indicators = candleData.map((k) => {
          closes.push(k.close);
          vols.push(k.volume || 0);
          if (k.volume && k.close) {
            cumPV += k.close * k.volume;
            cumV += k.volume;
          }
          const idx = closes.length - 1;
          const window = 20;
          const sma20 = idx + 1 >= window
            ? closes.slice(idx + 1 - window, idx + 1).reduce((a, b) => a + b, 0) / window
            : undefined;
          const vwap = cumV > 0 ? cumPV / cumV : undefined;
          return { time: k.time, sma20, vwap } as IndicatorData;
        });

        const signals: OracleSignal[] = (signalsResponse.data || []).map((s: any) => ({
          id: s.id,
          time: new Date(s.ts).getTime(),
          type: (s.direction > 0 ? 'bullish' : s.direction < 0 ? 'bearish' : 'neutral'),
          strength: Number(s.strength) || 0,
          summary: s.summary || ''
        }));

        setIndicatorData(indicators);
        setOracleSignals(signals);

      } catch (err) {
        console.error('Additional chart data fetch error:', err);
        // Fallback to demo data for demo accounts
        if (subscriptionStatus.isDemo) {
          setIndicatorData(DEMO_INDICATORS);
          setOracleSignals(DEMO_SIGNALS);
        } else {
          setIndicatorData([]);
          setOracleSignals([]);
        }
      }
    };

    if (symbol && workspaceId && rawCandles.length > 0) {
      fetchAdditionalData();
    }
  }, [symbol, workspaceId, rawCandles.length, subscriptionStatus.isDemo]);

  return {
    candleData,
    indicatorData,
    oracleSignals,
    loading,
    error,
    isDemo: subscriptionStatus.isDemo,
    isDegraded: candleState === 'degraded'
  };
};