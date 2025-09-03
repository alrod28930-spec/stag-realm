import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

export function OpenPositionsTable() {
  const { positions, isLoading } = useRealPortfolioStore();

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No open positions</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the manual order panel to place your first trade
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-sm text-muted-foreground">Symbol</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Side</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Qty</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Avg Price</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Market Value</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">P&L</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Since</th>
                <th className="pb-2 font-medium text-sm text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => {
                const pnl = position.unr_pnl || 0;
                const pnlPercent = position.mv > 0 ? 
                  (pnl / (position.mv - pnl)) * 100 : 0;
                
                return (
                  <tr key={`${position.symbol}-${index}`} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="font-semibold">{position.symbol}</div>
                    </td>
                    <td className="py-3">
                      <Badge variant={position.qty > 0 ? 'default' : 'secondary'}>
                        {position.qty > 0 ? 'Long' : 'Short'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{Math.abs(position.qty)}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">${position.avg_cost.toFixed(2)}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">${(position.mv || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-3">
                      <div className={`font-semibold ${
                        pnl >= 0 ? 'text-accent' : 'text-destructive'
                      }`}>
                        <div className="flex items-center gap-1">
                          {pnl >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(position.updated_at, { addSuffix: true })}
                      </div>
                    </td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}