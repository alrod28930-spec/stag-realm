import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Building2,
  FileText,
  Target,
  PieChart
} from 'lucide-react';
import { DemoDisclaimer } from '@/components/demo/DemoDisclaimer';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import { useDemoMode } from '@/utils/demoMode';
import { demoDataService } from '@/services/demoDataService';
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
    positions,
    isLoading,
    error,
    loadPortfolio,
    subscribeToUpdates
  } = useRealPortfolioStore();
  
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  // Load portfolio data and subscribe to updates (only for non-demo users)
  useEffect(() => {
    if (!isDemoMode) {
      loadPortfolio();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]); // Remove functions from deps to prevent infinite loop

  const handleRefresh = () => {
    if (!isDemoMode) {
      loadPortfolio();
    }
    toast({
      title: "Portfolio Refreshed",
      description: isDemoMode ? "Demo portfolio data refreshed." : "Portfolio data has been updated.",
    });
  };

  // Get portfolio data - only demo account gets mock data, real accounts are empty until API connection
  const getPortfolioData = () => {
    if (isDemoMode) {
      return demoDataService.getPortfolio();
    }
    return {
      equity: portfolio?.equity || 0,
      cash: portfolio?.cash || 0,
      positions: positions || []
    };
  };

  const portfolioData = getPortfolioData();
  
  // Calculate portfolio metrics
  const portfolioValue = portfolioData.equity || 0;
  const availableCash = portfolioData.cash || 0;
  const currentPositions = portfolioData.positions || [];
  const totalPositions = currentPositions.length;
  const totalUnrealizedPnL = currentPositions.reduce((sum, pos) => sum + (pos.unr_pnl || 0), 0);
  const totalMarketValue = currentPositions.reduce((sum, pos) => sum + (pos.mv || 0), 0);

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
      {/* Demo Disclaimer */}
      {isDemoMode && (
        <DemoDisclaimer feature="Portfolio Management" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Portfolio
            {isDemoMode && <DemoModeIndicator variant="badge" className="ml-3" />}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isDemoMode 
              ? "Explore portfolio tracking and management with demo data"
              : "Track and manage your investment positions"
            }
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading && !isDemoMode} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading && !isDemoMode) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && !isDemoMode && (
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
              {(isLoading && !isDemoMode) ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading positions...</span>
                </div>
              ) : currentPositions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No positions found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isDemoMode 
                      ? "Demo data shows an empty portfolio"
                      : "Your portfolio positions will appear here once you have investments"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentPositions.map((position, index) => (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
            isDemo={isDemoMode}
          />
          
          <RiskMetricsChart
            title="Risk Analysis"
            height={350}
            isDemo={isDemoMode}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationPieChart
            title="Holdings Allocation"
            viewMode="symbol"
            height={400}
            isDemo={isDemoMode}
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