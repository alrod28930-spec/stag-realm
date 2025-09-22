import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionAccess } from './useSubscriptionAccess';

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
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [indicatorData, setIndicatorData] = useState<IndicatorData[]>([]);
  const [oracleSignals, setOracleSignals] = useState<OracleSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { subscriptionStatus } = useSubscriptionAccess();

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Only use demo data for demo accounts, real accounts get empty data until API connection
        if (subscriptionStatus.isDemo) {
          setCandleData(DEMO_CANDLES);
          setIndicatorData(DEMO_INDICATORS);
          setOracleSignals(DEMO_SIGNALS);
          setLoading(false);
          return;
        }

        // Real accounts have empty data until API keys are connected
        setCandleData([]);
        setIndicatorData([]);  
        setOracleSignals([]);
        setLoading(false);
        return;

        // This code below will be used when API integration is added
        /*
        const [candlesResponse, indicatorsResponse, signalsResponse] = await Promise.all([
          supabase
            .from('candles')
            .select('*')
            .eq('symbol', symbol)
            .eq('tf', timeframe)
            .order('ts', { ascending: true })
            .limit(100),
          
          supabase
            .from('indicators')
            .select('*')
            .eq('symbol', symbol) 
            .eq('tf', timeframe)
            .order('ts', { ascending: true })
            .limit(100),
            
          supabase
            .from('oracle_signals')
            .select('*')
            .eq('symbol', symbol)
            .order('ts', { ascending: false })
            .limit(20)
        ]);

        if (candlesResponse.error) throw candlesResponse.error;
        if (indicatorsResponse.error) throw indicatorsResponse.error;
        if (signalsResponse.error) throw signalsResponse.error;

        // Transform candle data
        const candles = candlesResponse.data?.map(candle => ({
          time: new Date(candle.ts).getTime(),
          open: Number(candle.o) || 0,
          high: Number(candle.h) || 0,
          low: Number(candle.l) || 0,
          close: Number(candle.c) || 0,
          volume: Number(candle.v) || 0
        })) || [];

        // Transform indicator data
        const indicators = indicatorsResponse.data?.map(ind => ({
          time: new Date(ind.ts).getTime(),
          sma20: ind.ma20 ? Number(ind.ma20) : undefined,
          sma50: ind.ma50 ? Number(ind.ma50) : undefined,
          ema20: ind.ma20 ? Number(ind.ma20) : undefined, // Using ma20 as proxy
          rsi14: ind.rsi14 ? Number(ind.rsi14) : undefined,
          macd: ind.macd ? Number(ind.macd) : undefined,
          bb_upper: ind.bb_up ? Number(ind.bb_up) : undefined,
          bb_lower: ind.bb_dn ? Number(ind.bb_dn) : undefined,
          vwap: ind.vwap_sess ? Number(ind.vwap_sess) : undefined,
          atr14: ind.atr14 ? Number(ind.atr14) : undefined
        })) || [];

        // Transform oracle signals
        const signals: OracleSignal[] = signalsResponse.data?.map(signal => ({
          id: signal.id,
          time: new Date(signal.ts).getTime(),
          type: (signal.direction > 0 ? 'bullish' : signal.direction < 0 ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral',
          strength: Number(signal.strength) || 0,
          summary: signal.summary || ''
        })) || [];

        setCandleData(candles);
        setIndicatorData(indicators);
        setOracleSignals(signals);

      } catch (err) {
        console.error('Chart data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
        // Fallback to empty data on error for real accounts
        if (subscriptionStatus.isDemo) {
          setCandleData(DEMO_CANDLES);
          setIndicatorData(DEMO_INDICATORS);
          setOracleSignals(DEMO_SIGNALS);
        } else {
          setCandleData([]);
          setIndicatorData([]);
          setOracleSignals([]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchChartData();
    }
  }, [symbol, timeframe, subscriptionStatus]);

  return {
    candleData,
    indicatorData,
    oracleSignals,
    loading,
    error,
    isDemo: subscriptionStatus.isDemo
  };
};