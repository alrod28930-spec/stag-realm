import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { TradeOrder } from '@/adapters/BrokerAdapter';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  Eye,
  X,
  Plus,
  RefreshCw,
  Link
} from 'lucide-react';

export default function Portfolio() {
  const { 
    portfolio, 
    isConnected, 
    connectionStatus, 
    isLoading, 
    error, 
    connectBroker, 
    refreshPortfolio,
    executeTrade,
    clearError 
  } = usePortfolioStore();
  
  const [apiKey, setApiKey] = useState('');
  const [showConnectForm, setShowConnectForm] = useState(false);
  const { toast } = useToast();

  // Auto-refresh when connected
  useEffect(() => {
    if (isConnected && !portfolio) {
      refreshPortfolio();
    }
  }, [isConnected, portfolio, refreshPortfolio]);

  const handleConnect = async () => {
    try {
      const success = await connectBroker(apiKey || 'demo-key-12345');
      if (success) {
        toast({
          title: "Connected Successfully",
          description: "Your broker account has been connected.",
        });
        setShowConnectForm(false);
        setApiKey('');
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to broker",
        variant: "destructive",
      });
    }
  };

  const handleTrade = async (symbol: string, side: 'buy' | 'sell') => {
    try {
      const order: TradeOrder = {
        symbol,
        side,
        quantity: 1,
        orderType: 'market'
      };
      
      const result = await executeTrade(order);
      
      toast({
        title: "Trade Executed",
        description: `${side.toUpperCase()} order for ${symbol} ${result.status}`,
        variant: result.status === 'filled' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
        variant: "destructive",
      });
    }
  };

  // Use portfolio data if connected, otherwise fallback to mock data
  const portfolioData = portfolio || {
    totalValue: 125432.50,
    dayChange: 3245.20,
    dayChangePercent: 2.67,
    totalGainLoss: 12543.75,
    totalGainLossPercent: 11.12,
    availableCash: 25000.00,
    positions: []
  };

  const holdings = portfolio?.positions || [];
  
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
        <div className="flex items-center gap-4">
          {!isConnected ? (
            <Button 
              onClick={() => setShowConnectForm(true)}
              className="bg-gradient-primary hover:opacity-90 shadow-gold"
            >
              <Link className="w-4 h-4 mr-2" />
              Connect Broker
            </Button>
          ) : (
            <Button 
              onClick={refreshPortfolio}
              disabled={isLoading}
              variant="outline"
              className="border-primary/30 hover:border-primary/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button className="bg-gradient-primary hover:opacity-90 shadow-gold">
            <Plus className="w-4 h-4 mr-2" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Connection Form */}
      {showConnectForm && (
        <Card className="bg-gradient-card shadow-elevated border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Connect Broker Account</CardTitle>
            <CardDescription>
              Enter your broker API credentials to sync your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your broker API key (or leave empty for demo)"
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConnectForm(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={connectionStatus === 'connecting'}
                className="bg-gradient-primary hover:opacity-90"
              >
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +${portfolioData.dayChange.toLocaleString()} (+{portfolioData.dayChangePercent}%) today
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
              +${portfolioData.totalGainLoss.toLocaleString()}
            </div>
            <p className="text-xs text-accent">
              +{portfolioData.totalGainLossPercent}% all time
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
            <div className="text-2xl font-bold">${portfolioData.availableCash.toLocaleString()}</div>
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