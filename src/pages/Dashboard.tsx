import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  Users
} from 'lucide-react';

export default function Dashboard() {
  // Mock data for the dashboard
  const stats = [
    {
      title: 'Portfolio Value',
      value: '$125,432.50',
      change: '+2.5%',
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Daily P&L',
      value: '$3,245.20',
      change: '+15.2%',
      trend: 'up',
      icon: TrendingUp,
    },
    {
      title: 'Active Positions',
      value: '12',
      change: '+3',
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

  const positions = [
    { symbol: 'AAPL', side: 'Long', qty: 100, price: '$175.50', pnl: '+$1,250.00', pnlPercent: '+7.2%' },
    { symbol: 'GOOGL', side: 'Long', qty: 50, price: '$142.30', pnl: '-$125.50', pnlPercent: '-1.8%' },
    { symbol: 'MSFT', side: 'Short', qty: 75, price: '$378.90', pnl: '+$892.75', pnlPercent: '+3.1%' },
    { symbol: 'TSLA', side: 'Long', qty: 25, price: '$248.75', pnl: '+$625.00', pnlPercent: '+10.1%' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your trading activity.
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
            <div className="space-y-4">
              {positions.map((position, index) => (
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
    </div>
  );
}