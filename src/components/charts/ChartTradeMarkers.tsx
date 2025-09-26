import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, TrendingDown } from 'lucide-react';

interface TradeMarker {
  id: string;
  price: number;
  timestamp: Date;
  action: 'buy' | 'sell';
  botName: string;
  quantity: number;
  pnl?: number;
}

interface ChartTradeMarkersProps {
  trades: TradeMarker[];
  chartHeight: number;
  chartWidth: number;
  priceRange: { min: number; max: number };
}

export function ChartTradeMarkers({ trades, chartHeight, chartWidth, priceRange }: ChartTradeMarkersProps) {
  const [visibleTrades, setVisibleTrades] = useState<TradeMarker[]>([]);

  useEffect(() => {
    // Show only recent trades (last 10 minutes)
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    setVisibleTrades(trades.filter(trade => trade.timestamp > cutoff));
  }, [trades]);

  const getYPosition = (price: number): number => {
    const { min, max } = priceRange;
    const percentage = (max - price) / (max - min);
    return Math.max(20, Math.min(chartHeight - 20, percentage * chartHeight));
  };

  const getXPosition = (timestamp: Date): number => {
    const now = Date.now();
    const tradeTime = timestamp.getTime();
    const timeDiff = now - tradeTime;
    const maxTime = 10 * 60 * 1000; // 10 minutes
    const percentage = 1 - (timeDiff / maxTime);
    return Math.max(20, Math.min(chartWidth - 100, percentage * chartWidth));
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {visibleTrades.map((trade) => {
        const x = getXPosition(trade.timestamp);
        const y = getYPosition(trade.price);
        
        return (
          <div
            key={trade.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Trade Marker */}
            <div className={`relative flex items-center justify-center w-6 h-6 rounded-full border-2 ${
              trade.action === 'buy'
                ? 'bg-green-500 border-green-600 shadow-green-500/50'
                : 'bg-red-500 border-red-600 shadow-red-500/50'
            } shadow-lg animate-pulse`}>
              {trade.action === 'buy' ? (
                <TrendingUp className="w-3 h-3 text-white" />
              ) : (
                <TrendingDown className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Trade Info Tooltip */}
            <div className={`absolute ${
              trade.action === 'buy' ? 'bottom-8' : 'top-8'
            } left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg min-w-[140px] z-10`}>
              <div className="flex items-center gap-1 mb-1">
                <Bot className="w-3 h-3" />
                <span className="text-xs font-medium">{trade.botName}</span>
              </div>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action:</span>
                  <Badge variant={trade.action === 'buy' ? 'default' : 'destructive'} className="text-xs">
                    {trade.action.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qty:</span>
                  <span className="font-medium">{trade.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">${trade.price.toFixed(2)}</span>
                </div>
                {trade.pnl !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P&L:</span>
                    <span className={`font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {trade.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}