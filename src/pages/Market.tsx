import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Star,
  Volume2,
  BarChart3
} from 'lucide-react';

export default function Market() {
  const [searchTerm, setSearchTerm] = useState('');

  const marketData = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: +2.25, changePercent: +1.30, volume: '52.3M', marketCap: '2.75T' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.30, change: -1.85, changePercent: -1.28, volume: '28.7M', marketCap: '1.78T' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: +5.20, changePercent: +1.39, volume: '31.2M', marketCap: '2.82T' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.75, change: -12.45, changePercent: -4.77, volume: '89.1M', marketCap: '789B' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 146.28, change: +0.95, changePercent: +0.65, volume: '41.8M', marketCap: '1.52T' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change: +18.75, changePercent: +2.19, volume: '67.4M', marketCap: '2.15T' },
  ];

  const indices = [
    { name: 'S&P 500', symbol: 'SPX', price: 4725.80, change: +24.15, changePercent: +0.51 },
    { name: 'NASDAQ', symbol: 'IXIC', price: 14876.50, change: -45.32, changePercent: -0.30 },
    { name: 'DOW JONES', symbol: 'DJI', price: 37285.10, change: +125.67, changePercent: +0.34 },
  ];

  const topMovers = {
    gainers: [
      { symbol: 'NVDA', price: 875.30, change: +18.75, changePercent: +2.19 },
      { symbol: 'AMD', price: 142.85, change: +8.42, changePercent: +6.27 },
      { symbol: 'MSFT', price: 378.90, change: +5.20, changePercent: +1.39 },
    ],
    losers: [
      { symbol: 'TSLA', price: 248.75, change: -12.45, changePercent: -4.77 },
      { symbol: 'META', price: 325.15, change: -8.93, changePercent: -2.67 },
      { symbol: 'NFLX', price: 445.20, change: -7.35, changePercent: -1.62 },
    ]
  };

  const filteredMarketData = marketData.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Market Data</h1>
        <p className="text-muted-foreground mt-2">
          Real-time market data and analysis tools
        </p>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indices.map((index, i) => (
          <Card key={i} className="bg-gradient-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{index.name}</CardTitle>
              <CardDescription className="text-xs">{index.symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">${index.price.toLocaleString()}</p>
                  <p className={`text-sm flex items-center ${
                    index.change >= 0 ? 'text-accent' : 'text-destructive'
                  }`}>
                    {index.change >= 0 ? 
                      <TrendingUp className="w-3 h-3 mr-1" /> : 
                      <TrendingDown className="w-3 h-3 mr-1" />
                    }
                    {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Market Data */}
        <Card className="lg:col-span-3 bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stock Watchlist</CardTitle>
                <CardDescription>Monitor your favorite stocks in real-time</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMarketData.map((stock, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      <Star className="w-4 h-4" />
                    </Button>
                    <div>
                      <p className="font-semibold">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold">${stock.price}</p>
                      <p className={`text-sm flex items-center ${
                        stock.change >= 0 ? 'text-accent' : 'text-destructive'
                      }`}>
                        {stock.change >= 0 ? 
                          <TrendingUp className="w-3 h-3 mr-1" /> : 
                          <TrendingDown className="w-3 h-3 mr-1" />
                        }
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="flex items-center">
                        <Volume2 className="w-3 h-3 mr-1" />
                        {stock.volume}
                      </p>
                      <p>Cap: {stock.marketCap}</p>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Chart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Top Movers</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gainers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gainers">Gainers</TabsTrigger>
                <TabsTrigger value="losers">Losers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="gainers" className="space-y-3 mt-4">
                {topMovers.gainers.map((stock, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <div>
                      <p className="font-semibold text-sm">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">${stock.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent">+{stock.changePercent.toFixed(2)}%</p>
                      <p className="text-xs text-accent">+{stock.change.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="losers" className="space-y-3 mt-4">
                {topMovers.losers.map((stock, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <div>
                      <p className="font-semibold text-sm">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">${stock.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">{stock.changePercent.toFixed(2)}%</p>
                      <p className="text-xs text-destructive">{stock.change.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}