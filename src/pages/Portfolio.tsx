import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  Eye,
  X,
  Plus
} from 'lucide-react';

export default function Portfolio() {
  const portfolioOverview = {
    totalValue: 125432.50,
    dayChange: 3245.20,
    dayChangePercent: 2.67,
    totalGainLoss: 12543.75,
    totalGainLossPercent: 11.12,
    availableCash: 25000.00
  };

  const holdings = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 100,
      avgPrice: 165.30,
      currentPrice: 175.50,
      marketValue: 17550.00,
      gainLoss: 1020.00,
      gainLossPercent: 6.17,
      allocation: 13.97
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      shares: 50,
      avgPrice: 145.80,
      currentPrice: 142.30,
      marketValue: 7115.00,
      gainLoss: -175.00,
      gainLossPercent: -2.40,
      allocation: 5.67
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      shares: 75,
      avgPrice: 350.25,
      currentPrice: 378.90,
      marketValue: 28417.50,
      gainLoss: 2149.75,
      gainLossPercent: 8.18,
      allocation: 22.66
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      shares: 25,
      avgPrice: 275.60,
      currentPrice: 248.75,
      marketValue: 6218.75,
      gainLoss: -671.25,
      gainLossPercent: -9.73,
      allocation: 4.96
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      shares: 40,
      avgPrice: 825.45,
      currentPrice: 875.30,
      marketValue: 35012.00,
      gainLoss: 1994.00,
      gainLossPercent: 6.04,
      allocation: 27.91
    }
  ];

  const assetAllocation = [
    { category: 'Technology', value: 68.24, color: 'bg-primary' },
    { category: 'Healthcare', value: 12.15, color: 'bg-accent' },
    { category: 'Finance', value: 8.92, color: 'bg-warning' },
    { category: 'Consumer', value: 6.43, color: 'bg-destructive' },
    { category: 'Cash', value: 4.26, color: 'bg-muted' }
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
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Position
        </Button>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioOverview.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +${portfolioOverview.dayChange.toLocaleString()} (+{portfolioOverview.dayChangePercent}%) today
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gain/Loss
            </CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              +${portfolioOverview.totalGainLoss.toLocaleString()}
            </div>
            <p className="text-xs text-accent">
              +{portfolioOverview.totalGainLossPercent}% all time
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Cash
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioOverview.availableCash.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ready to invest</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positions
            </CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holdings.length}</div>
            <p className="text-xs text-muted-foreground">Active holdings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Your current investment positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {holdings.map((holding, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold">{holding.symbol}</p>
                        <Badge variant="outline" className="text-xs">
                          {holding.allocation.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {holding.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {holding.shares} shares @ ${holding.avgPrice}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-semibold">${holding.marketValue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      ${holding.currentPrice}
                    </p>
                    <p className={`text-sm font-medium ${
                      holding.gainLoss >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {holding.gainLoss >= 0 ? '+' : ''}${Math.abs(holding.gainLoss).toFixed(2)} 
                      ({holding.gainLoss >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                    </p>
                  </div>

                  <div className="ml-4 flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Portfolio distribution by sector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assetAllocation.map((asset, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{asset.category}</span>
                  <span className="text-muted-foreground">{asset.value}%</span>
                </div>
                <Progress value={asset.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}