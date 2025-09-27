import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedBrokerage } from '@/hooks/useUnifiedBrokerage';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  RefreshCw,
  AlertTriangle,
  Building2,
  FileText,
  Target,
  PieChart
} from 'lucide-react';
import Recorder from '@/pages/Recorder';
import { DividendCalculator } from '@/components/dividends/DividendCalculator';
import { DividendButton } from '@/components/tradingdesk/DividendButton';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { RiskMetricsChart } from '@/components/charts/RiskMetricsChart';
import { AllocationPieChart } from '@/components/charts/AllocationPieChart';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';

export default function Portfolio() {
  const { 
    portfolio,
    isConnected,
    isLoading, 
    lastSync,
    connections,
    totalValue,
    availableCash,
    positionsCount,
    unrealizedPnL,
    realizedPnL,
    refresh
  } = useUnifiedBrokerage();
  
  const { toast } = useToast();

  const handleRefresh = async () => {
    await refresh();
  };

  // Define portfolio stats using unified data
  const stats = [
    {
      title: 'Portfolio Value',
      value: `$${totalValue.toLocaleString()}`,
      change: unrealizedPnL >= 0 ? `+$${unrealizedPnL.toFixed(2)}` : `-$${Math.abs(unrealizedPnL).toFixed(2)}`,
      trend: unrealizedPnL >= 0 ? 'up' : 'down',
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
      value: `$${(totalValue - availableCash).toLocaleString()}`,
      change: `${positionsCount} positions`,
      trend: positionsCount > 0 ? 'up' : 'neutral',
      icon: BarChart3,
    },
    {
      title: 'Total P&L',
      value: unrealizedPnL >= 0 ? `+$${unrealizedPnL.toFixed(2)}` : `-$${Math.abs(unrealizedPnL).toFixed(2)}`,
      change: totalValue > 0 ? `${((unrealizedPnL / (totalValue - unrealizedPnL)) * 100).toFixed(2)}%` : '0.00%',
      trend: unrealizedPnL >= 0 ? 'up' : 'down',
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
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? `Connected (${connections.length})` : 'Disconnected'}
            </span>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Last sync: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {!isConnected && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="text-warning">No active brokerage connections found. Please configure your brokerage settings.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Section - Remove this once working */}
      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs space-y-2">
            <div>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Connections: {connections.length}</div>
            <div>Portfolio: {portfolio ? JSON.stringify({ cash: portfolio.cash, equity: portfolio.equity, positions: portfolio.positions.length }) : 'null'}</div>
            <div>Last Sync: {lastSync?.toISOString() || 'never'}</div>
            <div>Loading: {isLoading.toString()}</div>
          </div>
        </CardContent>
      </Card>

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
        <ScrollArea className="w-full">
          <TabsList className="grid w-full grid-cols-4 min-w-max">
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recorder" className="gap-2">
              <FileText className="w-4 h-4" />
              Audit Trail
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

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
              ) : !portfolio?.positions || portfolio.positions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No positions found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your portfolio positions will appear here once you have investments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {portfolio.positions.map((position, index) => (
                    <div key={`${position.symbol}-${index}`} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                      <div className="flex items-center gap-4">
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
                        <DividendButton
                          symbol={position.symbol}
                          shares={Math.abs(position.qty)}
                          currentPrice={position.mv / Math.abs(position.qty)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dividends" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Dividend Calculator</CardTitle>
              <CardDescription>
                Calculate dividend projections for your positions and potential investments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DividendCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <EquityCurveChart 
            data={undefined}
            title="Portfolio Equity Curve"
            showBenchmark={true}
            showDrawdown={false}
            height={350}
            isDemo={false}
          />
          
          <RiskMetricsChart
            title="Risk Analysis"
            height={350}
            isDemo={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationPieChart
            title="Holdings Allocation"
            viewMode="symbol"
            height={400}
            isDemo={false}
          />

          <Card>
            <CardHeader>
              <CardTitle>Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">AAPL</div>
                    <div className="text-sm text-muted-foreground">100 shares</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$15,000</div>
                    <div className="text-sm text-success">+$500 (3.4%)</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">MSFT</div>
                    <div className="text-sm text-muted-foreground">75 shares</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$12,500</div>
                    <div className="text-sm text-success">+$250 (2.0%)</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">GOOGL</div>
                    <div className="text-sm text-muted-foreground">50 shares</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">$10,000</div>
                    <div className="text-sm text-destructive">-$150 (-1.5%)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsContent value="recorder" className="space-y-6">
          <div className="h-screen overflow-hidden">
            <Recorder />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}