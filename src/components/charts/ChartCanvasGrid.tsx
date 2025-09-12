import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OracleOverlay } from './OracleOverlay';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Volume2,
  Zap
} from 'lucide-react';

interface ChartCanvasGridProps {
  symbol: string | null;
  timeframe: string;
  chartType: 'candle' | 'line' | 'heikin';
  layout: '1' | '2' | '4';
  indicators: Record<string, boolean>;
  oracleOverlayEnabled: boolean;
}

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate mock chart data
const generateMockData = (symbol: string, timeframe: string): ChartData[] => {
  const data: ChartData[] = [];
  const now = new Date();
  const intervals = timeframe === '1m' ? 100 : timeframe === '5m' ? 100 : 50;
  
  let basePrice = Math.random() * 100 + 50;
  
  for (let i = intervals; i >= 0; i--) {
    const time = new Date(now.getTime() - i * getTimeframeMinutes(timeframe) * 60 * 1000);
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility;
    
    const open = basePrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.random() * 1000000 + 100000;
    
    data.push({
      time: time.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(volume)
    });
    
    basePrice = close;
  }
  
  return data;
};

const getTimeframeMinutes = (timeframe: string): number => {
  switch (timeframe) {
    case '1m': return 1;
    case '5m': return 5;
    case '15m': return 15;
    case '1h': return 60;
    case '4h': return 240;
    case '1D': return 1440;
    default: return 15;
  }
};

const ChartPane: React.FC<{
  symbol: string;
  timeframe: string;
  chartType: 'candle' | 'line' | 'heikin';
  indicators: Record<string, boolean>;
  oracleOverlayEnabled: boolean;
  className?: string;
}> = ({ symbol, timeframe, chartType, indicators, oracleOverlayEnabled, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create main series - using basic line chart
    const series = chart.addSeries('Line', {
      color: 'hsl(var(--primary))',
      lineWidth: 2,
    });

    seriesRef.current = series;

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [chartType]);

  // Load data when symbol or timeframe changes
  useEffect(() => {
    if (!symbol) return;

    setIsLoading(true);
    
    // Simulate data loading
    setTimeout(() => {
      const data = generateMockData(symbol, timeframe);
      setChartData(data);
      
      if (seriesRef.current) {
        const lineData = data.map(d => ({
          time: d.time,
          value: d.close
        }));
        seriesRef.current.setData(lineData);
      }
      
      setIsLoading(false);
    }, 300);
  }, [symbol, timeframe, chartType]);

  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const priceChange = latestData && previousData ? latestData.close - previousData.close : 0;
  const priceChangePercent = previousData ? (priceChange / previousData.close) * 100 : 0;

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
        
        {latestData && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">${latestData.close.toFixed(2)}</span>
            <span className={`flex items-center gap-1 ${
              priceChange >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {priceChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} 
              ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full min-h-[400px]"
        style={{ position: 'relative' }}
      />

      {/* Oracle Overlay */}
      {oracleOverlayEnabled && symbol && (
        <OracleOverlay 
          symbol={symbol}
          timeframe={timeframe}
          chartData={chartData}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="w-6 h-6 text-primary" />
          </motion.div>
        </div>
      )}
    </Card>
  );
};

export const ChartCanvasGrid: React.FC<ChartCanvasGridProps> = ({
  symbol,
  timeframe,
  chartType,
  layout,
  indicators,
  oracleOverlayEnabled
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
            chartType={chartType}
            indicators={indicators}
            oracleOverlayEnabled={oracleOverlayEnabled}
            className="w-full h-full"
          />
        );
      case '2':
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            <ChartPane
              symbol={symbol}
              timeframe={timeframe}
              chartType={chartType}
              indicators={indicators}
              oracleOverlayEnabled={oracleOverlayEnabled}
            />
            <ChartPane
              symbol={symbol}
              timeframe="1h" // Different timeframe for comparison
              chartType={chartType}
              indicators={indicators}
              oracleOverlayEnabled={oracleOverlayEnabled}
            />
          </div>
        );
      case '4':
        return (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {['15m', '1h', '4h', '1D'].map((tf, index) => (
              <ChartPane
                key={tf}
                symbol={symbol}
                timeframe={tf}
                chartType={chartType}
                indicators={indicators}
                oracleOverlayEnabled={oracleOverlayEnabled}
              />
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