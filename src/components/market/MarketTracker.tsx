import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Activity, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  sparklineData: number[];
}

const MiniSparkline: React.FC<{ data: number[], isPositive: boolean }> = ({ data, isPositive }) => {
  if (!data || data.length < 2) return <div className="w-16 h-6 bg-muted/20 rounded" />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 16;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
        strokeWidth="1.5"
        className="opacity-80"
      />
    </svg>
  );
};

const MarketItemCard: React.FC<{ item: MarketItem }> = ({ item }) => {
  const isPositive = item.change >= 0;
  
  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{item.symbol}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            {item.volume ? `${(item.volume / 1000000).toFixed(1)}M` : 'N/A'}
          </Badge>
        </div>
        <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 truncate">
        {item.name}
      </div>
      
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1 text-xs",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{isPositive ? '+' : ''}{item.change.toFixed(2)}</span>
          <span>({isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%)</span>
        </div>
        
        <MiniSparkline data={item.sparklineData} isPositive={isPositive} />
      </div>
    </div>
  );
};

export const MarketTracker: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate mock market data
  const generateMarketData = (): MarketItem[] => {
    const baseSymbols = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', basePrice: 442 },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', basePrice: 378 },
      { symbol: 'AAPL', name: 'Apple Inc', basePrice: 189 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 378 },
      { symbol: 'TSLA', name: 'Tesla Inc', basePrice: 248 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 875 },
      { symbol: 'AMZN', name: 'Amazon.com Inc', basePrice: 151 },
      { symbol: 'GOOGL', name: 'Alphabet Inc', basePrice: 140 }
    ];

    return baseSymbols.map(base => {
      const change = (Math.random() - 0.5) * 10;
      const changePercent = (change / base.basePrice) * 100;
      const currentPrice = base.basePrice + change;
      
      // Generate sparkline data (last 20 data points)
      const sparklineData = Array.from({ length: 20 }, (_, i) => {
        const variation = Math.sin(i * 0.5) * 2 + (Math.random() - 0.5) * 3;
        return base.basePrice + variation + (change * (i / 19));
      });

      return {
        symbol: base.symbol,
        name: base.name,
        price: currentPrice,
        change,
        changePercent,
        volume: Math.floor(Math.random() * 100) * 1000000,
        sparklineData
      };
    });
  };

  const refreshMarketData = async () => {
    setIsRefreshing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setMarketData(generateMarketData());
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    // Initial load
    refreshMarketData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshMarketData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg">Market Tracker</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMarketData}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {marketData.map((item) => (
              <MarketItemCard key={item.symbol} item={item} />
            ))}
          </div>
        </ScrollArea>
        
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Paper trading simulation data</span>
            <Badge variant="outline" className="text-xs">
              Live Demo
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};