/**
 * Risk Counter Display - Shows daily trading activity and limits
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface RiskCounter {
  workspace_id: string;
  day: string;
  trades: number;
  losses: number;
  wins: number;
  total_pnl: number;
  last_loss_at: string | null;
  last_trade_at: string | null;
}

interface RiskCounterDisplayProps {
  workspaceId: string;
}

export function RiskCounterDisplay({ workspaceId }: RiskCounterDisplayProps) {
  const [counter, setCounter] = useState<RiskCounter | null>(null);
  const [maxTrades, setMaxTrades] = useState(20);
  const [maxLoss, setMaxLoss] = useState(0.05);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get today's counter
        const today = new Date().toISOString().split('T')[0];
        const { data: counterData } = await supabase
          .from('risk_counters')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('day', today)
          .maybeSingle();

        setCounter(counterData);

        // Get policy for limits
        const { data: policy } = await supabase
          .from('risk_policies')
          .select('max_trades_per_day, max_daily_loss_pct')
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (policy) {
          setMaxTrades(policy.max_trades_per_day);
          setMaxLoss(policy.max_daily_loss_pct);
        }
      } catch (err) {
        console.error('Failed to fetch risk counter:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const trades = counter?.trades || 0;
  const wins = counter?.wins || 0;
  const losses = counter?.losses || 0;
  const totalPnL = counter?.total_pnl || 0;
  const winRate = trades > 0 ? (wins / trades * 100).toFixed(1) : '0.0';
  
  const tradesProgress = (trades / maxTrades) * 100;
  const pnlPct = totalPnL; // Already in percentage from counter
  const lossProgress = Math.abs(pnlPct) / (maxLoss * 100) * 100;

  const getPnLColor = () => {
    if (totalPnL > 0) return 'text-green-500';
    if (totalPnL < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Today's Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trades Counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trades</span>
            <span className="font-medium">
              {trades} / {maxTrades}
            </span>
          </div>
          <Progress value={tradesProgress} className="h-2" />
          {trades >= maxTrades && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Daily limit reached
            </Badge>
          )}
        </div>

        {/* Win/Loss */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Wins</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{wins}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Losses</div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">{losses}</span>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Win Rate</div>
          <div className="text-2xl font-bold">{winRate}%</div>
        </div>

        {/* P&L */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily P&L</span>
            <span className={`font-medium ${getPnLColor()}`}>
              {totalPnL > 0 ? '+' : ''}{totalPnL.toFixed(2)}%
            </span>
          </div>
          {pnlPct < 0 && (
            <>
              <Progress value={lossProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Loss limit: -{(maxLoss * 100).toFixed(1)}%
              </p>
              {lossProgress >= 100 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Circuit breaker active
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Last Trade */}
        {counter?.last_trade_at && (
          <div className="text-xs text-muted-foreground">
            Last trade: {new Date(counter.last_trade_at).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
