import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { useTradingStats } from '@/hooks/useTradingStats';

export function KpiRow() {
  const { stats, isLoading } = useTradingStats();

  const kpis = [
    {
      title: 'Win Rate',
      value: `${stats?.winRate || 0}%`,
      progress: stats?.winRate || 0,
      icon: TrendingUp,
      color: 'bg-accent'
    },
    {
      title: 'Total Return',
      value: `${stats?.totalReturn >= 0 ? '+' : ''}${stats?.totalReturn || 0}%`,
      progress: Math.abs(stats?.totalReturn || 0),
      icon: DollarSign,
      color: (stats?.totalReturn || 0) >= 0 ? 'bg-accent' : 'bg-destructive'
    },
    {
      title: 'Total Trades',
      value: `${stats?.totalTrades || 0}`,
      subtitle: `${stats?.tradesLast30d || 0} last 30d`,
      icon: Activity,
      color: 'bg-primary'
    },
    {
      title: 'Sharpe Ratio',
      value: stats?.sharpeRatio !== undefined ? stats.sharpeRatio.toFixed(2) : '—',
      subtitle: 'Risk-adjusted return',
      icon: BarChart3,
      color: 'bg-secondary'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-8 bg-muted rounded mb-2" />
              <div className="h-2 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{kpi.value}</div>
            {kpi.progress !== undefined ? (
              <div className="space-y-1">
                <Progress value={kpi.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {kpi.progress.toFixed(1)}% success rate
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {kpi.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}