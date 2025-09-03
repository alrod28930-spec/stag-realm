import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';
import { useTradingStats } from '@/hooks/useTradingStats';

export function HitRateCard() {
  const { stats, isLoading } = useTradingStats();

  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const breakeven = stats?.breakeven || 0;
  const total = wins + losses + breakeven;

  const winPercent = total > 0 ? (wins / total) * 100 : 0;
  const lossPercent = total > 0 ? (losses / total) * 100 : 0;
  const breakevenPercent = total > 0 ? (breakeven / total) * 100 : 0;

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
          Wins vs Losses
        </CardTitle>
        <Target className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stacked Progress Bar */}
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            {total > 0 ? (
              <>
                <div 
                  className="absolute top-0 left-0 h-full bg-accent transition-all duration-300"
                  style={{ width: `${winPercent}%` }}
                />
                <div 
                  className="absolute top-0 h-full bg-destructive transition-all duration-300"
                  style={{ 
                    left: `${winPercent}%`, 
                    width: `${lossPercent}%` 
                  }}
                />
                <div 
                  className="absolute top-0 h-full bg-muted-foreground transition-all duration-300"
                  style={{ 
                    left: `${winPercent + lossPercent}%`, 
                    width: `${breakevenPercent}%` 
                  }}
                />
              </>
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-accent rounded-full" />
              <span>Wins</span>
              <span className="font-medium ml-auto">{wins}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              <span>Losses</span>
              <span className="font-medium ml-auto">{losses}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              <span>Even</span>
              <span className="font-medium ml-auto">{breakeven}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span className="font-semibold text-accent">
                {winPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}