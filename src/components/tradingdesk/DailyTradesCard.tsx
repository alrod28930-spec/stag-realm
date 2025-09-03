import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';
import { useTradingStats } from '@/hooks/useTradingStats';

export function DailyTradesCard() {
  const { stats, isLoading } = useTradingStats();

  const todayTrades = stats?.todayTrades || 0;
  const dailyCap = stats?.dailyTradeCap || 10; // Default cap
  const avgPerformance = stats?.avgPerformance7d || 0;
  const trendDirection = avgPerformance >= 0 ? 'up' : 'down';

  const progressPercent = (todayTrades / dailyCap) * 100;

  if (isLoading) {
    return (
      <Card className="animate-pulse bg-gradient-card shadow-card">
        <CardContent className="p-6">
          <div className="h-4 bg-muted rounded mb-2" />
          <div className="h-8 bg-muted rounded mb-4" />
          <div className="h-2 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Daily Trades
        </CardTitle>
        <Clock className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Today's count */}
          <div>
            <div className="text-2xl font-bold mb-2">
              {todayTrades} / {dailyCap}
            </div>
            <Progress 
              value={progressPercent} 
              className="h-2 mb-2"
            />
            <p className="text-xs text-muted-foreground">
              {Math.max(0, dailyCap - todayTrades)} trades remaining today
            </p>
          </div>

          {/* Average Performance */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center text-sm">
              <span>Avg Performance (7d)</span>
              <div className="flex items-center gap-1">
                <span 
                  className={`font-semibold ${
                    trendDirection === 'up' ? 'text-accent' : 'text-destructive'
                  }`}
                >
                  {avgPerformance >= 0 ? '+' : ''}{avgPerformance.toFixed(2)}%
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  trendDirection === 'up' ? 'bg-accent' : 'bg-destructive'
                }`} />
              </div>
            </div>
          </div>

          {/* Hold Time */}
          {stats?.avgHoldTime && (
            <div className="flex justify-between text-sm">
              <span>Avg Hold Time</span>
              <span className="font-medium">{stats.avgHoldTime}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}