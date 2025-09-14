import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  Building2,
  RefreshCw,
  AlertTriangle,
  Settings,
  ArrowRight
} from 'lucide-react';
import { ComplianceStatus } from '@/components/compliance/ComplianceStatus';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { DemoDisclaimer } from '@/components/demo/DemoDisclaimer';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import { RiskDisclaimerBanner, FloatingRiskIndicator } from '@/components/compliance/RiskDisclaimerBanner';
import { useDemoMode } from '@/utils/demoMode';
import { demoDataService } from '@/services/demoDataService';
import { MiniOracleWidget } from '@/components/dashboard/MiniOracleWidget';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { AllocationPieChart } from '@/components/charts/AllocationPieChart';
import { RiskMetricsChart } from '@/components/charts/RiskMetricsChart';

export default function Dashboard() {
  console.log('📊 Dashboard component rendering');
  const { portfolio, positions, loadPortfolio, subscribeToUpdates } = useRealPortfolioStore();
  const { isDemoMode } = useDemoMode();

  // Load portfolio data and subscribe to updates (only for non-demo users)
  useEffect(() => {
    if (!isDemoMode) {
      loadPortfolio();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [loadPortfolio, subscribeToUpdates, isDemoMode]);

  // Get portfolio data based on demo mode
  const portfolioData = isDemoMode ? demoDataService.getPortfolio() : {
    equity: portfolio?.equity || 0,
    cash: portfolio?.cash || 0,
    positions: positions || []
  };

  // Calculate real-time stats
  const portfolioValue = portfolioData.equity || 0;
  const availableCash = portfolioData.cash || 0;
  const currentPositions = portfolioData.positions || [];
  const totalPositions = currentPositions.length;
  const totalUnrealizedPnL = currentPositions.reduce((sum, pos) => sum + (pos.unr_pnl || 0), 0);

  // Mock data for other stats that would come from trading bots, etc.
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
      title: 'Active Positions',
      value: totalPositions.toString(),
      change: `${totalPositions} holdings`,
      trend: 'up',
      icon: BarChart3,
    },
    {
      title: 'Running Bots',
      value: '7',
      change: 'Stable',
      trend: 'neutral',
      icon: Activity,
    },
  ];

  // Use real positions or demo data
  const displayPositions = currentPositions.slice(0, 4).map(pos => ({
    symbol: pos.symbol,
    side: pos.qty > 0 ? 'Long' : 'Short',
    qty: Math.abs(pos.qty),
    price: `$${pos.avg_cost.toFixed(2)}`,
    pnl: pos.unr_pnl >= 0 ? `+$${pos.unr_pnl.toFixed(2)}` : `-$${Math.abs(pos.unr_pnl).toFixed(2)}`,
    pnlPercent: pos.mv > 0 ? `${((pos.unr_pnl / (pos.mv - pos.unr_pnl)) * 100).toFixed(1)}%` : '0.0%'
  }));

  return (
    <div className="space-y-8">
      {/* Risk Disclaimer Banner */}
      <RiskDisclaimerBanner />
      
      {/* Demo Disclaimer */}
      {isDemoMode && (
        <DemoDisclaimer feature="Trading Dashboard" />
      )}
      
      {/* Floating Risk Indicator */}
      <FloatingRiskIndicator />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Trading Dashboard
            {isDemoMode && <DemoModeIndicator variant="badge" className="ml-3" />}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isDemoMode 
              ? "Explore our trading platform with simulated data and features"
              : "Welcome back! Here's an overview of your trading activity."
            }
          </p>
        </div>
      </div>

      {/* Brokerage Connection Notice */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Connect Your Brokerage Account</h3>
                <p className="text-xs text-muted-foreground">
                  Set up live trading by connecting your broker in Settings
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center space-x-2"
              onClick={() => window.location.href = '/settings'}
            >
              <Settings className="h-4 w-4" />
              <span>Go to Settings</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
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
                {' '}from yesterday
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <EquityCurveChart 
            data={undefined}
            title="30-Day Performance"
            showBenchmark={true}
            height={280}
            isDemo={isDemoMode}
          />
          
          <AllocationPieChart
            title="Portfolio Allocation"
            viewMode="symbol"
            height={280}
            isDemo={isDemoMode}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RiskMetricsChart
            title="Risk Dashboard"
            height={250}
            isDemo={isDemoMode}
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">AAPL Signal Generated</span>
                  <span className="text-xs text-muted-foreground">2m ago</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Portfolio Rebalanced</span>
                  <span className="text-xs text-muted-foreground">1h ago</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">Risk Check Passed</span>
                  <span className="text-xs text-muted-foreground">3h ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <MiniOracleWidget />
        </div>

      {/* Compliance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceStatus />
        <ComplianceDashboard />
      </div>
    </div>
  );
}