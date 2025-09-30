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

  // Refs to avoid stale closures in event handlers
  const snapTradingModeRef = useRef(snapTradingMode);
  const currentPriceRef = useRef(currentPrice);
  const orderSizeRef = useRef(orderSize);
  useEffect(() => { snapTradingModeRef.current = snapTradingMode; }, [snapTradingMode]);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);
  useEffect(() => { orderSizeRef.current = orderSize; }, [orderSize]);

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

  // Initialize chart once (avoid recreate on every data/timeframe change)
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(var(--foreground))'
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: timeframe.includes('s') || timeframe.includes('m')
      },
      grid: {
        vertLines: { color: 'rgba(34, 211, 238, 0.1)' },
        horzLines: { color: 'rgba(34, 211, 238, 0.1)' }
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
      upColor: 'rgba(34, 211, 238, 0.8)',
      downColor: 'rgba(34, 211, 238, 0.5)',
      borderVisible: true,
      borderUpColor: 'rgba(34, 211, 238, 1)',
      borderDownColor: 'rgba(34, 211, 238, 1)',
      wickUpColor: 'rgba(34, 211, 238, 1)',
      wickDownColor: 'rgba(34, 211, 238, 1)'
    });
    candleSeriesRef.current = candleSeries;

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(34, 211, 238, 0.3)',
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0 },
    });

    // Crosshair and click handlers for snap trading using refs (no resubscribe needed)
    let crosshairHandler: Parameters<typeof chart.subscribeCrosshairMove>[0] | null = null;
    let clickHandler: Parameters<typeof chart.subscribeClick>[0] | null = null;

    if (showSnapTrading) {
      crosshairHandler = (param) => {
        if (!snapTradingModeRef.current || !param.point) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price) setCurrentPrice(price);
      };
      chart.subscribeCrosshairMove(crosshairHandler);

      clickHandler = (param) => {
        if (!snapTradingModeRef.current || !param.point) return;
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (!price) return;
        const order: OrderOverlay = {
          id: Date.now().toString(),
          type: price > (currentPriceRef.current || 0) ? 'buy' : 'sell',
          price,
          quantity: orderSizeRef.current || 100,
          status: 'pending',
          timestamp: Date.now()
        };
        setOrders(prev => [...prev, order]);
        onOrderPlace?.(order);
        toast({
          title: `Snap ${order.type.toUpperCase()} Order`,
          description: `${order.quantity} shares at $${price.toFixed(2)}`,
        });
      };
      chart.subscribeClick(clickHandler);
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        if (showSnapTrading) {
          if (crosshairHandler) chart.unsubscribeCrosshairMove(crosshairHandler);
          if (clickHandler) chart.unsubscribeClick(clickHandler);
        }
      } catch {}
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, []);

  // Apply chart options on timeframe/height changes
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.applyOptions({
        height,
        timeScale: { secondsVisible: timeframe.includes('s') || timeframe.includes('m') }
      });
    } catch {}
  }, [timeframe, height]);

  // Update candle & volume data when it changes
  useEffect(() => {
    if (!candleSeriesRef.current || candleData.length === 0) return;

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
      color: candle.close >= candle.open ? 'rgba(34, 211, 238, 0.6)' : 'rgba(34, 211, 238, 0.3)',
    }));

    try {
      candleSeriesRef.current.setData(chartData);
      volumeSeriesRef.current?.setData(volumeData);
    } catch {}

    if (chartData.length > 0) {
      setCurrentPrice(chartData[chartData.length - 1].close);
    }
  }, [candleData]);

  // Update indicators/overlays when indicator data or toggles change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Clear existing overlay series
    if (overlaySeriesRef.current.length) {
      try {
        overlaySeriesRef.current.forEach((s) => {
          try { (chart as any).removeSeries?.(s); } catch {}
        });
      } catch {}
      overlaySeriesRef.current = [];
    }

    if (!indicatorData.length) return;

    if (activeIndicators.vwap) {
      const vwapSeries = chart.addSeries(LineSeries, {
        color: 'rgba(34, 211, 238, 1)',
        lineWidth: 2,
        title: 'VWAP'
      });
      const vwapData = indicatorData
        .filter(ind => ind.vwap !== undefined)
        .map(ind => ({
          time: Math.floor(ind.time / 1000) as any,
          value: ind.vwap!,
        }));
      try { vwapSeries.setData(vwapData); } catch {}
      overlaySeriesRef.current.push(vwapSeries);
    }
  }, [indicatorData, activeIndicators]);

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