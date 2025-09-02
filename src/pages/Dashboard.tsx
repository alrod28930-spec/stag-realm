import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  Building2
} from 'lucide-react';
import { ComplianceStatus } from '@/components/compliance/ComplianceStatus';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';

export default function Dashboard() {
  const { portfolio, positions, loadPortfolio, subscribeToUpdates } = useRealPortfolioStore();
  const { currentWorkspace } = useWorkspaceStore();

  // Load portfolio data and subscribe to updates
  useEffect(() => {
    if (currentWorkspace) {
      loadPortfolio();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [currentWorkspace, loadPortfolio, subscribeToUpdates]);

  // Calculate real-time stats
  const portfolioValue = portfolio?.equity || 0;
  const availableCash = portfolio?.cash || 0;
  const totalPositions = positions.length;
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unr_pnl || 0), 0);

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

  // Use real positions or show empty state
  const displayPositions = positions.slice(0, 4).map(pos => ({
    symbol: pos.symbol,
    side: pos.qty > 0 ? 'Long' : 'Short',
    qty: Math.abs(pos.qty),
    price: `$${pos.avg_cost.toFixed(2)}`,
    pnl: pos.unr_pnl >= 0 ? `+$${pos.unr_pnl.toFixed(2)}` : `-$${Math.abs(pos.unr_pnl).toFixed(2)}`,
    pnlPercent: pos.mv > 0 ? `${((pos.unr_pnl / (pos.mv - pos.unr_pnl)) * 100).toFixed(1)}%` : '0.0%'
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your trading activity.
          {currentWorkspace && (
            <span className="flex items-center mt-1">
              <Building2 className="w-4 h-4 mr-1" />
              {currentWorkspace.name}
            </span>
          )}
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions Table */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>
              Your current market positions and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayPositions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No positions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your portfolio positions will appear here once you have investments
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayPositions.map((position, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant={position.side === 'Long' ? 'default' : 'secondary'}
                        className="w-14 justify-center"
                      >
                        {position.side}
                      </Badge>
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {position.qty} shares @ {position.price}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        position.pnl.startsWith('+') ? 'text-accent' : 'text-destructive'
                      }`}>
                        {position.pnl}
                      </p>
                      <p className={`text-sm ${
                        position.pnlPercent.startsWith('+') ? 'text-accent' : 'text-destructive'
                      }`}>
                        {position.pnlPercent}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Market Connection</span>
                <Badge className="bg-accent">Live</Badge>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Bot Performance</span>
                <span className="text-accent">87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Risk Utilization</span>
                <span className="text-warning">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Today's Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades Executed</span>
                  <span>23</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="text-accent">78.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Hold Time</span>
                  <span>2h 15m</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceStatus />
        <ComplianceDashboard />
      </div>
    </div>
  );
}