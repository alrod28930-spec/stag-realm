import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  StopCircle, 
  MousePointer2,
  Maximize2,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  side: 'long' | 'short';
  entryTime: number;
}

interface PositionMiniChartProps {
  position: Position;
  height?: number;
  onTradeClick?: (action: 'add' | 'reduce' | 'close', symbol: string) => void;
  onChartExpand?: (symbol: string) => void;
  isDemo?: boolean;
}

export const PositionMiniChart: React.FC<PositionMiniChartProps> = ({
  position,
  height = 200,
  onTradeClick,
  onChartExpand,
  isDemo = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  
  const { toast } = useToast();

  // Generate mini chart data (1-minute candles for last 2 hours)
  useEffect(() => {
    const generateData = () => {
      const data = [];
      const now = Date.now();
      let currentPrice = position.currentPrice;
      
      // Generate 120 1-minute candles (2 hours)
      for (let i = 119; i >= 0; i--) {
        const timestamp = now - (i * 60 * 1000);
        
        // Add some realistic price movement
        const volatility = 0.002; // 0.2% volatility per minute
        const change = (Math.random() - 0.5) * volatility;
        const open = currentPrice;
        const close = currentPrice * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
        
        data.push({
          time: Math.floor(timestamp / 1000),
          open,
          high,
          low,
          close,
          volume: Math.floor(Math.random() * 10000) + 1000
        });
        
        currentPrice = close;
      }
      
      return data;
    };

    setChartData(generateData());
  }, [position.currentPrice]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !chartData.length) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(var(--muted-foreground))'
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        scaleMargins: { top: 0.1, bottom: 0.1 }
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: () => '' // Hide time labels for mini chart
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false }
      },
      crosshair: {
        mode: 0 // Hidden crosshair for mini chart
      }
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(var(--success))',
      downColor: 'hsl(var(--destructive))',
      borderVisible: false,
      wickUpColor: 'hsl(var(--success))',
      wickDownColor: 'hsl(var(--destructive))'
    });

    candleSeries.setData(chartData);

    // Add entry price line
    const entryLineSeries = chart.addSeries(LineSeries, {
      color: 'hsl(var(--warning))',
      lineWidth: 2,
      lineStyle: 2, // Dashed line
      title: 'Entry Price'
    });

    const entryLineData = chartData.map(candle => ({
      time: candle.time,
      value: position.avgPrice
    }));

    entryLineSeries.setData(entryLineData);

    // Current price line
    const currentPriceSeries = chart.addSeries(LineSeries, {
      color: position.unrealizedPnL >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
      lineWidth: 2,
      title: 'Current Price'
    });

    const currentPriceData = chartData.map(candle => ({
      time: candle.time,
      value: position.currentPrice
    }));

    currentPriceSeries.setData(currentPriceData);

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, position.avgPrice, position.currentPrice, position.unrealizedPnL, height]);

  const handleTradeAction = (action: 'add' | 'reduce' | 'close') => {
    onTradeClick?.(action, position.symbol);
    
    const actionMessages = {
      add: `Adding to ${position.symbol} position`,
      reduce: `Reducing ${position.symbol} position`, 
      close: `Closing ${position.symbol} position`
    };
    
    toast({
      title: "Trade Action",
      description: actionMessages[action],
    });
  };

  const getPnLColor = () => {
    return position.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive';
  };

  const getChangePercent = () => {
    if (position.avgPrice === 0) return 0;
    return ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{position.symbol}</h3>
            <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
              {position.side.toUpperCase()}
            </Badge>
            {isDemo && (
              <Badge variant="outline" className="text-xs">DEMO</Badge>
            )}
          </div>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChartExpand?.(position.symbol)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Position Stats */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quantity:</span>
            <span className="font-mono">{Math.abs(position.quantity)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg Price:</span>
            <span className="font-mono">${position.avgPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-mono">${position.currentPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">P&L:</span>
            <div className="text-right">
              <div className={`font-semibold ${getPnLColor()}`}>
                {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(0)}
              </div>
              <div className={`text-xs ${getPnLColor()}`}>
                {getChangePercent() >= 0 ? '+' : ''}{getChangePercent().toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mini Chart */}
        <div
          ref={chartContainerRef}
          style={{ height: `${height}px` }}
          className="w-full"
        />

        {/* Quick Action Buttons - Show on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-success border-success hover:bg-success/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTradeAction('add');
                }}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Add
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-warning border-warning hover:bg-warning/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTradeAction('reduce');
                }}
              >
                <Activity className="w-4 h-4 mr-1" />
                Reduce
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTradeAction('close');
                }}
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Entry/Exit Markers */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Entry</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              position.unrealizedPnL >= 0 ? 'bg-success' : 'bg-destructive'
            }`}></div>
            <span className="text-muted-foreground">Current</span>
          </div>
          
          <span className="text-muted-foreground">
            {new Date(position.entryTime).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
};