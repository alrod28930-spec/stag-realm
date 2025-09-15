import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Volume2 } from 'lucide-react';

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  lastTrade: number;
}

interface OrderBookDOMProps {
  symbol: string;
  onLevelClick?: (side: 'bid' | 'ask', price: number, size: number) => void;
  height?: number;
  maxLevels?: number;
}

export const OrderBookDOM: React.FC<OrderBookDOMProps> = ({
  symbol,
  onLevelClick,
  height = 400,
  maxLevels = 10
}) => {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [],
    asks: [],
    spread: 0,
    lastTrade: 0
  });

  const [lastTradeDirection, setLastTradeDirection] = useState<'up' | 'down'>('up');

  // Simulate real-time order book data
  useEffect(() => {
    const generateOrderBookLevel = (basePrice: number, side: 'bid' | 'ask', offset: number): OrderBookLevel => {
      const price = side === 'bid' 
        ? basePrice - (offset * 0.01) 
        : basePrice + (offset * 0.01);
      
      return {
        price: parseFloat(price.toFixed(2)),
        size: Math.floor(Math.random() * 1000) + 100,
        orders: Math.floor(Math.random() * 10) + 1
      };
    };

    const updateOrderBook = () => {
      const basePrice = 150.50 + (Math.random() - 0.5) * 2; // Simulate AAPL-like price
      const lastTrade = basePrice + (Math.random() - 0.5) * 0.10;
      
      setLastTradeDirection(lastTrade > orderBook.lastTrade ? 'up' : 'down');
      
      const bids: OrderBookLevel[] = [];
      const asks: OrderBookLevel[] = [];

      for (let i = 0; i < maxLevels; i++) {
        bids.push(generateOrderBookLevel(basePrice, 'bid', i + 0.5));
        asks.push(generateOrderBookLevel(basePrice, 'ask', i + 0.5));
      }

      // Sort bids descending, asks ascending
      bids.sort((a, b) => b.price - a.price);
      asks.sort((a, b) => a.price - b.price);

      const spread = asks[0]?.price - bids[0]?.price || 0;

      setOrderBook({
        bids,
        asks,
        spread,
        lastTrade
      });
    };

    // Initial data
    updateOrderBook();

    // Update every 500ms for real-time feel
    const interval = setInterval(updateOrderBook, 500);

    return () => clearInterval(interval);
  }, [maxLevels, orderBook.lastTrade]);

  const handleLevelClick = (side: 'bid' | 'ask', level: OrderBookLevel) => {
    onLevelClick?.(side, level.price, level.size);
  };

  const getMaxSize = () => {
    const allSizes = [...orderBook.bids, ...orderBook.asks].map(level => level.size);
    return Math.max(...allSizes, 1);
  };

  const maxSize = getMaxSize();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{symbol} Level II</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Spread: ${orderBook.spread.toFixed(2)}
            </Badge>
            <Badge 
              variant={lastTradeDirection === 'up' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {lastTradeDirection === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              ${orderBook.lastTrade.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div style={{ height: `${height}px` }} className="flex flex-col">
          {/* Column Headers */}
          <div className="grid grid-cols-3 gap-2 px-3 py-1 text-xs font-medium text-muted-foreground border-b">
            <div className="text-center">Price</div>
            <div className="text-center">Size</div>
            <div className="text-center">Orders</div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-0">
              {/* Asks (Sell Orders) - Red */}
              <div className="space-y-0">
                {orderBook.asks.slice().reverse().map((level, index) => (
                  <div
                    key={`ask-${index}`}
                    className="relative grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-destructive/10 cursor-pointer transition-colors border-b border-muted/20"
                    onClick={() => handleLevelClick('ask', level)}
                  >
                    {/* Size visualization background */}
                    <div 
                      className="absolute inset-0 bg-destructive/5"
                      style={{ width: `${(level.size / maxSize) * 100}%` }}
                    />
                    
                    <div className="relative text-destructive font-mono">
                      ${level.price.toFixed(2)}
                    </div>
                    <div className="relative text-center">
                      {level.size.toLocaleString()}
                    </div>
                    <div className="relative text-center text-muted-foreground">
                      {level.orders}
                    </div>
                  </div>
                ))}
              </div>

              {/* Spread Indicator */}
              <div className="flex items-center justify-center py-2 bg-muted/30">
                <Badge variant="outline" className="text-xs">
                  Spread: ${orderBook.spread.toFixed(2)}
                </Badge>
              </div>

              {/* Bids (Buy Orders) - Green */}
              <div className="space-y-0">
                {orderBook.bids.map((level, index) => (
                  <div
                    key={`bid-${index}`}
                    className="relative grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-success/10 cursor-pointer transition-colors border-b border-muted/20"
                    onClick={() => handleLevelClick('bid', level)}
                  >
                    {/* Size visualization background */}
                    <div 
                      className="absolute inset-0 bg-success/5"
                      style={{ width: `${(level.size / maxSize) * 100}%` }}
                    />
                    
                    <div className="relative text-success font-mono">
                      ${level.price.toFixed(2)}
                    </div>
                    <div className="relative text-center">
                      {level.size.toLocaleString()}
                    </div>
                    <div className="relative text-center text-muted-foreground">
                      {level.orders}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Quick Action Buttons */}
          <div className="p-2 border-t bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="text-success border-success hover:bg-success/10"
                onClick={() => orderBook.bids[0] && handleLevelClick('bid', orderBook.bids[0])}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Buy @ Bid
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => orderBook.asks[0] && handleLevelClick('ask', orderBook.asks[0])}
              >
                <TrendingDown className="w-3 h-3 mr-1" />
                Sell @ Ask
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};