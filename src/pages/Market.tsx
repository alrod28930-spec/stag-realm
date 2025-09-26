import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  BarChart3,
  Activity,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SymbolSearchInput } from '@/components/market/SymbolSearchInput';
import { FullSearchPage } from '@/components/market/FullSearchPage';
import { DisclaimerBadge } from '@/components/compliance/DisclaimerBadge';
import { MarketDataDisclaimer } from '@/components/market/MarketDataDisclaimer';

export default function Market() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simulate loading market data
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Market indices data (this would come from real market data API)
  const indices = [
    { symbol: 'SPY', name: 'S&P 500 ETF', price: 415.25, change: 2.15, changePercent: 0.52 },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF', price: 348.90, change: -1.85, changePercent: -0.53 },
    { symbol: 'IWM', name: 'Russell 2000 ETF', price: 195.75, change: 0.85, changePercent: 0.44 },
    { symbol: 'DIA', name: 'Dow Jones ETF', price: 340.60, change: 1.25, changePercent: 0.37 },
  ];

  const handleSearch = (query: string) => {
    setIsLoading(true);
    // This would be replaced with real market data search
    setTimeout(() => {
      setSearchResults([]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Market Center
            <DisclaimerBadge variant="minimal" component="market_search" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Search and analyze market data with live pricing and fundamentals
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Market Data Disclaimer */}
      <MarketDataDisclaimer />

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {indices.map((index, i) => (
          <Card key={i} className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {index.symbol}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{index.name}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">${index.price}</div>
                <div className={`text-xs flex items-center ${
                  index.change >= 0 ? 'text-accent' : 'text-destructive'
                }`}>
                  {index.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {index.change >= 0 ? '+' : ''}{index.change} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent}%)
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Symbol Search</TabsTrigger>
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Symbol Search & Analysis</CardTitle>
              <CardDescription>
                Search for stocks, ETFs, and other securities to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SymbolSearchInput 
                  onSymbolSelect={(symbol, symbolInfo) => {
                    console.log('Selected symbol:', symbol, symbolInfo);
                    toast({
                      title: "Symbol Selected",
                      description: `Selected ${symbol} - ${symbolInfo?.name || 'Unknown'}`,
                    });
                  }}
                  placeholder="Search for any symbol (e.g., AAPL, MSFT, SPY)..."
                  className="w-full"
                />
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Search Results</h3>
                    <ScrollArea className="h-64 border rounded-md p-2">
                      {searchResults.map((result, index) => (
                        <div key={index} className="p-2 hover:bg-muted rounded cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{result.symbol}</p>
                              <p className="text-sm text-muted-foreground">{result.name}</p>
                            </div>
                            <Badge variant="outline">{result.type}</Badge>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Full Search Page Component */}
          <FullSearchPage />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Market Analysis Tools</CardTitle>
              <CardDescription>
                Advanced market analysis and screening tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Connect your brokerage account to access advanced market analysis tools
                </p>
                <Button className="mt-4" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Enable Market Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}