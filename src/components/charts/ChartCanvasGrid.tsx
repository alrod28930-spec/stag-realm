import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OracleOverlay } from './OracleOverlay';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity
} from 'lucide-react';

interface ChartCanvasGridProps {
  symbol: string | null;
  timeframe: string;
  chartType: 'candle' | 'line' | 'heikin';
  layout: '1' | '2' | '4';
  indicators: Record<string, boolean>;
  oracleOverlayEnabled: boolean;
}

const ChartPane: React.FC<{
  symbol: string;
  timeframe: string;
  className?: string;
}> = ({ symbol, timeframe, className }) => {
  const mockPrice = (Math.random() * 100 + 50).toFixed(2);
  const mockChange = ((Math.random() - 0.5) * 5).toFixed(2);
  const isPositive = parseFloat(mockChange) >= 0;

  return (
    <Card className={`relative h-full ${className}`}>
      {/* Chart Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">{symbol}</span>
          <Badge variant="outline" className="text-xs">
            {timeframe}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">${mockPrice}</span>
          <span className={`flex items-center gap-1 ${
            isPositive ? 'text-success' : 'text-destructive'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}{mockChange}
          </span>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chart for {symbol} ({timeframe})</p>
          <p className="text-xs text-muted-foreground mt-2">Live charts coming soon</p>
        </div>
      </div>
    </Card>
  );
};

export const ChartCanvasGrid: React.FC<ChartCanvasGridProps> = ({
  symbol,
  timeframe,
  layout
}) => {
  if (!symbol) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Symbol</h3>
          <p className="text-muted-foreground">
            Choose a symbol from the left panel to start charting
          </p>
        </div>
      </div>
    );
  }

  const renderLayout = () => {
    switch (layout) {
      case '1':
        return (
          <ChartPane
            symbol={symbol}
            timeframe={timeframe}
            className="w-full h-full"
          />
        );
      case '2':
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            <ChartPane symbol={symbol} timeframe={timeframe} />
            <ChartPane symbol={symbol} timeframe="1h" />
          </div>
        );
      case '4':
        return (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {['15m', '1h', '4h', '1D'].map((tf) => (
              <ChartPane key={tf} symbol={symbol} timeframe={tf} />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 h-full">
      {renderLayout()}
    </div>
  );
};