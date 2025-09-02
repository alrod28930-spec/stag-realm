import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  RefreshCw,
  Building2
} from 'lucide-react';

export default function Portfolio() {
  const { 
    portfolio, 
    positions,
    isLoading, 
    error, 
    loadPortfolio,
    refreshData,
    subscribeToUpdates
  } = useRealPortfolioStore();
  
  const { currentWorkspace } = useWorkspaceStore();
  const { toast } = useToast();

  // Load portfolio data and subscribe to updates
  useEffect(() => {
    if (currentWorkspace) {
      loadPortfolio();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [currentWorkspace, loadPortfolio, subscribeToUpdates]);

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast({
        title: "Portfolio Refreshed",
        description: "Latest data has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh portfolio",
        variant: "destructive",
      });
    }
  };

  // Calculate portfolio metrics
  const portfolioValue = portfolio?.equity || 0;
  const availableCash = portfolio?.cash || 0;
  const totalPositions = positions.length;
  
  // Calculate total unrealized P&L
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unr_pnl || 0), 0);
  const totalRealizedPnL = positions.reduce((sum, pos) => sum + (pos.r_pnl || 0), 0);
  
  // Asset allocation based on current positions
  const assetAllocation = positions.map(pos => ({
    symbol: pos.symbol,
    value: portfolioValue > 0 ? (pos.mv / portfolioValue) * 100 : 0,
    marketValue: pos.mv
  })).slice(0, 5); // Top 5 positions

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your investment positions
            {currentWorkspace && (
              <span className="flex items-center mt-1">
                <Building2 className="w-4 h-4 mr-1" />
                {currentWorkspace.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            className="border-primary/30 hover:border-primary/50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No Workspace Message */}
      {!currentWorkspace && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-warning">Please select a workspace to view portfolio data.</p>
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
            <div className="text-2xl font-bold">${portfolioValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${totalUnrealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {totalUnrealizedPnL >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString()} unrealized
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Realized P&L
            </CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized gains/losses
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
            <div className="text-2xl font-bold">${availableCash.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{totalPositions}</div>
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
            {positions.length === 0 ? (
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
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{position.symbol}</p>
                          <Badge variant="outline" className="text-xs">
                            {portfolioValue > 0 ? ((position.mv / portfolioValue) * 100).toFixed(1) : '0'}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {position.qty} shares @ ${position.avg_cost.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="font-semibold">${position.mv.toLocaleString()}</p>
                      <p className={`text-sm font-medium ${
                        (position.unr_pnl || 0) >= 0 ? 'text-accent' : 'text-destructive'
                      }`}>
                        {(position.unr_pnl || 0) >= 0 ? '+' : ''}${Math.abs(position.unr_pnl || 0).toFixed(2)} 
                        ({(position.unr_pnl && position.mv) ? (((position.unr_pnl / (position.mv - position.unr_pnl)) * 100).toFixed(2)) : '0.00'}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Top Holdings</CardTitle>
            <CardDescription>Largest positions by value</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assetAllocation.slice(0, 5).map((asset, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{asset.symbol}</span>
                  <span className="text-muted-foreground">{asset.value.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${asset.marketValue.toLocaleString()}</span>
                </div>
                <Progress value={asset.value} className="h-2" />
              </div>
            ))}
            {assetAllocation.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No positions to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}