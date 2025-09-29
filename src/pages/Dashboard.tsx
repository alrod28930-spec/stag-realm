import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  RefreshCw,
  AlertTriangle,
  Building2,
  PieChart,
  Zap
} from 'lucide-react';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useToast } from '@/hooks/use-toast';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { RiskDisclaimerBanner, FloatingRiskIndicator } from '@/components/compliance/RiskDisclaimerBanner';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { RiskMetricsChart } from '@/components/charts/RiskMetricsChart';
import { AllocationPieChart } from '@/components/charts/AllocationPieChart';

export default function Dashboard() {
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

  // Get portfolio data from real brokerage connections
  const portfolioData = {
    equity: portfolio?.equity || 0,
    cash: portfolio?.cash || 0,
    positions: positions || []
  };
  
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

  const handleRefresh = () => {
    loadPortfolio();
    toast({
      title: "Dashboard Refreshed",
      description: "Portfolio data has been updated.",
    });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Risk Disclaimer Banner */}
      <RiskDisclaimerBanner />
      
      {/* Floating Risk Indicator */}
      <FloatingRiskIndicator />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Trading Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your portfolio performance and trading activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* No Portfolio Connection Warning */}
      {portfolioValue === 0 && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-warning-foreground">No Portfolio Data Found</p>
                <p className="text-sm text-warning-foreground/80">
                  Connect your brokerage account in Settings to start tracking your portfolio and enable live trading.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Building2 className="w-4 h-4 mr-2" />
                  Connect Brokerage Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Charts Grid */}
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
          data={currentPositions.map((pos, idx) => ({
            name: pos.symbol,
            value: pos.mv || 0,
            color: `hsl(${(idx * 360) / currentPositions.length}, 70%, 50%)`,
            percentage: totalMarketValue > 0 ? ((pos.mv || 0) / totalMarketValue) * 100 : 0
          }))}
        />

        <Card>
          <CardHeader>
            <CardTitle>Position Summary</CardTitle>
            <CardDescription>
              Current portfolio positions and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading positions...</span>
              </div>
            ) : currentPositions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No positions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your portfolio positions will appear here once you have investments
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentPositions.slice(0, 5).map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">{Math.abs(position.qty)} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${(position.mv || 0).toLocaleString()}</div>
                      <div className={`text-sm ${(position.unr_pnl || 0) >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {(position.unr_pnl || 0) >= 0 ? '+' : ''}${(position.unr_pnl || 0).toFixed(2)} 
                        ({position.mv > 0 ? 
                          `${(((position.unr_pnl || 0) / (position.mv - (position.unr_pnl || 0))) * 100).toFixed(2)}%` : 
                          '0.00%'
                        })
                      </div>
                    </div>
                  </div>
                ))}
                {currentPositions.length > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-muted-foreground">
                      And {currentPositions.length - 5} more positions...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Dashboard */}
      <ComplianceDashboard />
    </div>
  );
}