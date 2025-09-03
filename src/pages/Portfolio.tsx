import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  RefreshCw,
  AlertTriangle,
  Building2
} from 'lucide-react';

export default function Portfolio() {
  const {
    portfolio,
    positions,
    isLoading,
    error,
    loadPortfolio,
    subscribeToUpdates
  } = useRealPortfolioStore();
  
  const { toast } = useToast();

  // Load portfolio data and subscribe to updates
  useEffect(() => {
    loadPortfolio();
    const unsubscribe = subscribeToUpdates();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove functions from deps to prevent infinite loop

  const handleRefresh = () => {
    loadPortfolio();
    toast({
      title: "Portfolio Refreshed",
      description: "Portfolio data has been updated.",
    });
  };

  // Calculate portfolio metrics
  const portfolioValue = portfolio?.equity || 0;
  const availableCash = portfolio?.cash || 0;
  const totalPositions = positions.length;
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unr_pnl || 0), 0);
  const totalMarketValue = positions.reduce((sum, pos) => sum + (pos.mv || 0), 0);

  const stats = [
    {
      title: 'Portfolio Value',
      value: `$${portfolioValue.toLocaleString()}`,
      change: totalUnrealizedPnL >= 0 ? `+$${totalUnrealizedPnL.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnL).toFixed(2)}`,
      trend: totalUnrealizedPnL >= 0 ? 'up' : 'down',
      icon: DollarSign,
    },
    {
      title: 'Available Cash',
      value: `$${availableCash.toLocaleString()}`,
      change: 'Ready to invest',
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Market Value',
      value: `$${totalMarketValue.toLocaleString()}`,
      change: `${totalPositions} positions`,
      trend: totalPositions > 0 ? 'up' : 'neutral',
      icon: BarChart3,
    },
    {
      title: 'Total P&L',
      value: totalUnrealizedPnL >= 0 ? `+$${totalUnrealizedPnL.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnL).toFixed(2)}`,
      change: portfolioValue > 0 ? `${((totalUnrealizedPnL / (portfolioValue - totalUnrealizedPnL)) * 100).toFixed(2)}%` : '0.00%',
      trend: totalUnrealizedPnL >= 0 ? 'up' : 'down',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your investment positions
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">Failed to load portfolio data: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span 
                  className={`inline-flex items-center ${
                    stat.trend === 'up' ? 'text-accent' : 
                    stat.trend === 'down' ? 'text-destructive' : 
                    'text-muted-foreground'
                  }`}
                >
                  {stat.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {stat.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {stat.change}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="positions" className="w-full">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>
                Real-time view of your investment positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading positions...</span>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No positions found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your portfolio positions will appear here once you have investments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((position, index) => (
                    <div 
                      key={`${position.symbol}-${index}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={position.qty > 0 ? 'default' : 'secondary'}
                          className="w-16 justify-center"
                        >
                          {position.qty > 0 ? 'Long' : 'Short'}
                        </Badge>
                        <div>
                          <p className="font-semibold text-lg">{position.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.abs(position.qty)} shares @ ${position.avg_cost.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Market Value: ${(position.mv || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${
                          (position.unr_pnl || 0) >= 0 ? 'text-accent' : 'text-destructive'
                        }`}>
                          {(position.unr_pnl || 0) >= 0 ? '+' : ''}${(position.unr_pnl || 0).toFixed(2)}
                        </p>
                        <p className={`text-sm ${
                          (position.unr_pnl || 0) >= 0 ? 'text-accent' : 'text-destructive'
                        }`}>
                          {position.mv > 0 ? 
                            `${(((position.unr_pnl || 0) / (position.mv - (position.unr_pnl || 0))) * 100).toFixed(2)}%` : 
                            '0.00%'
                          }
                        </p>
                        {position.r_pnl && position.r_pnl !== 0 && (
                          <p className="text-xs text-muted-foreground">
                            Realized: ${position.r_pnl.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Portfolio performance analysis and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Total Return</h4>
                  <div className="text-2xl font-bold text-accent">
                    {portfolioValue > 0 ? 
                      `${((totalUnrealizedPnL / (portfolioValue - totalUnrealizedPnL)) * 100).toFixed(2)}%` : 
                      '0.00%'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Since inception</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Cash Utilization</h4>
                  <div className="text-2xl font-bold">
                    {portfolioValue > 0 ? 
                      `${((totalMarketValue / portfolioValue) * 100).toFixed(1)}%` : 
                      '0.0%'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Invested capital</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Diversification</h4>
                  <div className="text-2xl font-bold">{totalPositions}</div>
                  <p className="text-xs text-muted-foreground">Active positions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}