import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  Target,
  StopCircle,
  X,
  MousePointer2,
  Settings
} from 'lucide-react';
import { useChartData } from '@/hooks/useChartData';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/use-toast';

interface OrderOverlay {
  id: string;
  type: 'buy' | 'sell' | 'stop' | 'target';
  price: number;
  quantity: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  side: 'long' | 'short';
}

interface RealTimeTradingChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  showOrderBook?: boolean;
  showSnapTrading?: boolean;
  enableHotkeys?: boolean;
  onOrderPlace?: (order: any) => void;
  onOrderCancel?: (orderId: string) => void;
  onOrderModify?: (orderId: string, newPrice: number) => void;
}

export const RealTimeTradingChart: React.FC<RealTimeTradingChartProps> = ({
  symbol,
  timeframe = '1m',
  height = 500,
  showOrderBook = false,
  showSnapTrading = true,
  enableHotkeys = true,
  onOrderPlace,
  onOrderCancel,
  onOrderModify
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const overlaySeriesRef = useRef<any[]>([]);
  
  const [orders, setOrders] = useState<OrderOverlay[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [snapTradingMode, setSnapTradingMode] = useState(false);
  const [orderSize, setOrderSize] = useState(100);
  const [activeIndicators, setActiveIndicators] = useState({
    vwap: true,
    sma9: false,
    sma21: false,
    ema50: false,
    rsi: false,
    macd: false,
    bollingerBands: false
  });

  const { candleData, indicatorData, loading, error } = useChartData(symbol, timeframe);
  const { subscriptionStatus } = useSubscriptionAccess();
  const { toast } = useToast();

  // Real-time data subscription (simulated for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      if (candleData.length > 0) {
        const lastCandle = candleData[candleData.length - 1];
        const newPrice = lastCandle.close + (Math.random() - 0.5) * 0.5;
        setCurrentPrice(newPrice);
        
        // Update position P&L if we have a position
        if (position) {
          const unrealizedPnL = (newPrice - position.avgPrice) * position.quantity * (position.side === 'long' ? 1 : -1);
          setPosition(prev => prev ? { ...prev, currentPrice: newPrice, unrealizedPnL } : null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [candleData, position]);

  // Hotkey handling
  useEffect(() => {
    if (!enableHotkeys) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      const size = e.shiftKey ? orderSize * 2 : orderSize;
      
      switch (e.key.toLowerCase()) {
        case 'b':
          handleQuickOrder('buy', size);
          break;
        case 's':
          handleQuickOrder('sell', size);
          break;
        case 'c':
          handleCancelAllOrders();
          break;
        case 'f':
          handleFlattenPosition();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableHotkeys, orderSize, currentPrice]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !candleData.length) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(var(--foreground))'
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        scaleMargins: { top: 0.1, bottom: 0.2 }
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: timeframe.includes('s') || timeframe.includes('m')
      },
      grid: {
        vertLines: { color: 'hsl(var(--border) / 0.1)' },
        horzLines: { color: 'hsl(var(--border) / 0.1)' }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'hsl(var(--primary))',
          labelBackgroundColor: 'hsl(var(--primary))'
        },
        horzLine: {
          color: 'hsl(var(--primary))',
          labelBackgroundColor: 'hsl(var(--primary))'
        }
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
    candleSeriesRef.current = candleSeries;

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'hsl(var(--muted-foreground) / 0.3)',
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
    });

    // Set data
    const chartData = candleData.map(candle => ({
      time: Math.floor(candle.time / 1000) as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData = candleData.map(candle => ({
      time: Math.floor(candle.time / 1000) as any,
      value: candle.volume,
      color: candle.close >= candle.open ? 'hsl(var(--success) / 0.7)' : 'hsl(var(--destructive) / 0.7)',
    }));

    candleSeries.setData(chartData);
    volumeSeries.setData(volumeData);

    // Set current price from last candle
    if (chartData.length > 0) {
      setCurrentPrice(chartData[chartData.length - 1].close);
    }

    // Add indicators
    if (activeIndicators.vwap && indicatorData.length > 0) {
      const vwapSeries = chart.addSeries(LineSeries, {
        color: 'hsl(var(--warning))',
        lineWidth: 2,
        title: 'VWAP'
      });

      const vwapData = indicatorData
        .filter(ind => ind.vwap !== undefined)
        .map(ind => ({
          time: Math.floor(ind.time / 1000) as any,
          value: ind.vwap!,
        }));

      vwapSeries.setData(vwapData);
      overlaySeriesRef.current.push(vwapSeries);
    }

    // Click handler for snap trading
    if (showSnapTrading) {
      chart.subscribeCrosshairMove((param) => {
        if (!snapTradingMode || !param.point) return;
        
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
          setCurrentPrice(price);
        }
      });

      chart.subscribeClick((param) => {
        if (!snapTradingMode || !param.point) return;
        
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) {
          handleSnapOrder(price);
        }
      });
    }

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
  }, [candleData, indicatorData, activeIndicators, snapTradingMode]);

  // Order management functions
  const handleQuickOrder = useCallback((side: 'buy' | 'sell', quantity: number) => {
    if (!currentPrice) return;

    const order: OrderOverlay = {
      id: Date.now().toString(),
      type: side,
      price: currentPrice,
      quantity,
      status: 'pending',
      timestamp: Date.now()
    };

    setOrders(prev => [...prev, order]);
    onOrderPlace?.(order);

    toast({
      title: `${side.toUpperCase()} Order Placed`,
      description: `${quantity} shares of ${symbol} at $${currentPrice.toFixed(2)}`,
    });
  }, [currentPrice, symbol, onOrderPlace, toast]);

  const handleSnapOrder = useCallback((price: number) => {
    const order: OrderOverlay = {
      id: Date.now().toString(),
      type: price > currentPrice ? 'buy' : 'sell',
      price,
      quantity: orderSize,
      status: 'pending',
      timestamp: Date.now()
    };

    setOrders(prev => [...prev, order]);
    onOrderPlace?.(order);

    toast({
      title: `Snap ${order.type.toUpperCase()} Order`,
      description: `${orderSize} shares at $${price.toFixed(2)}`,
    });
  }, [currentPrice, orderSize, onOrderPlace, toast]);

  const handleCancelOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    onOrderCancel?.(orderId);
  }, [onOrderCancel]);

  const handleCancelAllOrders = useCallback(() => {
    setOrders([]);
    toast({
      title: "All Orders Cancelled",
      description: `Cancelled ${orders.length} pending orders`,
    });
  }, [orders.length, toast]);

  const handleFlattenPosition = useCallback(() => {
    if (!position) return;
    
    const flattenOrder: OrderOverlay = {
      id: Date.now().toString(),
      type: position.side === 'long' ? 'sell' : 'buy',
      price: currentPrice,
      quantity: Math.abs(position.quantity),
      status: 'pending',
      timestamp: Date.now()
    };

    setOrders(prev => [...prev, flattenOrder]);
    onOrderPlace?.(flattenOrder);

    toast({
      title: "Position Flattened",
      description: `Closing ${Math.abs(position.quantity)} shares of ${symbol}`,
    });
  }, [position, currentPrice, symbol, onOrderPlace, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (error || candleData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-muted-foreground">
          {error ? `Error: ${error}` : 'No data available for this symbol'}
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">{symbol}</CardTitle>
            <Badge variant="outline">{timeframe}</Badge>
            <Badge variant={currentPrice > 0 ? 'default' : 'secondary'}>
              ${currentPrice.toFixed(2)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Order Buttons */}
            {showSnapTrading && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-success border-success hover:bg-success/10"
                  onClick={() => handleQuickOrder('buy', orderSize)}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  BUY
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => handleQuickOrder('sell', orderSize)}
                >
                  <TrendingDown className="w-4 h-4 mr-1" />
                  SELL
                </Button>
                <Separator orientation="vertical" className="h-6" />
              </>
            )}

            {/* Snap Trading Toggle */}
            <Button
              variant={snapTradingMode ? "default" : "outline"}
              size="sm"
              onClick={() => setSnapTradingMode(!snapTradingMode)}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>

            {/* Position Actions */}
            {position && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlattenPosition}
                  className="text-warning border-warning hover:bg-warning/10"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Flatten
                </Button>
              </>
            )}

            {/* Cancel All */}
            {orders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAllOrders}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel All
              </Button>
            )}
          </div>
        </div>

        {/* Position Display */}
        {position && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
              {position.side.toUpperCase()} {Math.abs(position.quantity)}
            </Badge>
            <span className="text-muted-foreground">
              Avg: ${position.avgPrice.toFixed(2)}
            </span>
            <span className={position.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}>
              {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
            </span>
          </div>
        )}

        {/* Pending Orders */}
        {orders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {orders.map(order => (
              <Badge
                key={order.id}
                variant="outline"
                className={`cursor-pointer ${
                  order.type === 'buy' ? 'text-success' : 'text-destructive'
                }`}
                onClick={() => handleCancelOrder(order.id)}
              >
                {order.type.toUpperCase()} {order.quantity} @ ${order.price.toFixed(2)}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={chartContainerRef}
          style={{ height: `${height}px` }}
          className="w-full cursor-crosshair"
        />
      </CardContent>

      {/* Hotkey Hints */}
      {enableHotkeys && (
        <div className="px-4 pb-2">
          <div className="text-xs text-muted-foreground">
            Hotkeys: B=Buy, S=Sell, C=Cancel All, F=Flatten, Shift+B/S=Double Size
          </div>
        </div>
      )}
    </Card>
  );
};