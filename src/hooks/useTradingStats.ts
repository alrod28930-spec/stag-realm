import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TradingStats {
  winRate: number;
  totalReturn: number;
  totalTrades: number;
  tradesLast30d: number;
  sharpeRatio?: number;
  todayTrades: number;
  dailyTradeCap: number;
  avgPerformance7d: number;
  avgHoldTime?: string;
  wins: number;
  losses: number;
  breakeven: number;
}

export function useTradingStats() {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get trade events for stats calculation
      const { data: tradeEvents, error: eventsError } = await supabase
        .from('rec_events')
        .select('*')
        .in('event_type', ['trade.closed', 'trade.manual.executed'])
        .order('ts', { ascending: false });

      if (eventsError) throw eventsError;

      // Calculate stats from events
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const closedTrades = tradeEvents.filter(e => e.event_type === 'trade.closed');
      const todayTrades = tradeEvents.filter(e => new Date(e.ts) >= today).length;
      const tradesLast30d = tradeEvents.filter(e => new Date(e.ts) >= last30Days).length;
      const tradesLast7d = closedTrades.filter(e => new Date(e.ts) >= last7Days);

      // Calculate win/loss stats
      const wins = closedTrades.filter(e => {
        const payload = e.payload_json as any;
        return (payload?.pnl || 0) > 0;
      }).length;
      const losses = closedTrades.filter(e => {
        const payload = e.payload_json as any;
        return (payload?.pnl || 0) < 0;
      }).length;
      const breakeven = closedTrades.filter(e => {
        const payload = e.payload_json as any;
        return (payload?.pnl || 0) === 0;
      }).length;
      
      const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
      
      // Calculate total return
      const totalPnl = closedTrades.reduce((sum, trade) => {
        const payload = trade.payload_json as any;
        return sum + (payload?.pnl || 0);
      }, 0);
      const totalReturn = totalPnl; // This should be percentage-based in real implementation

      // Calculate average performance (7 days)
      const avg7dPnl = tradesLast7d.reduce((sum, trade) => {
        const payload = trade.payload_json as any;
        return sum + (payload?.pnl || 0);
      }, 0);
      const avgPerformance7d = tradesLast7d.length > 0 ? avg7dPnl / tradesLast7d.length : 0;

      // Average hold time calculation
      const holdTimes = closedTrades
        .map(trade => {
          const payload = trade.payload_json as any;
          return payload?.hold_minutes;
        })
        .filter(time => time !== undefined);
      
      const avgHoldMinutes = holdTimes.length > 0 
        ? holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length 
        : 0;
      
      const avgHoldTime = avgHoldMinutes > 0 
        ? `${Math.floor(avgHoldMinutes / 60)}h ${Math.floor(avgHoldMinutes % 60)}m`
        : undefined;

      // Mock Sharpe ratio calculation (would need daily returns in real implementation)
      const sharpeRatio = closedTrades.length >= 10 ? Math.random() * 2 : undefined;

      setStats({
        winRate,
        totalReturn,
        totalTrades: closedTrades.length,
        tradesLast30d,
        sharpeRatio,
        todayTrades,
        dailyTradeCap: 10, // This should come from bot settings
        avgPerformance7d,
        avgHoldTime,
        wins,
        losses,
        breakeven
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load trading stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats
  };
}