import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { useEnhancedCandles } from '@/hooks/useEnhancedCandles';
import { useOracleIndicators } from '@/hooks/useOracleIndicators';
import { useTimeSync } from '@/hooks/useTimeSync';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { format } from 'date-fns';
import { getCurrentUserWorkspace } from '@/utils/auth';

interface CandlestickChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  showVolume?: boolean;
  showOracleSignals?: boolean;
  className?: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  timeframe = '1D',
  height = 400,
  showControls = true,
  showIndicators = true,
  showVolume = true,
  showOracleSignals = true,
  className = ''
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const [workspaceId, setWorkspaceId] = useState<string>('');
  
  const [activeIndicators, setActiveIndicators] = useState({
    ema9: false,
    ema21: false,
    sma20: true,
    rsi14: false,
    vwap: false
  });

  const { state, data: candleData, error, lastUpdated } = useEnhancedCandles(workspaceId, symbol, timeframe);
  const { indicators: oracleIndicators } = useOracleIndicators(workspaceId, symbol, timeframe, showOracleSignals);
  const { linked, range, setRange } = useTimeSync();
  const { subscriptionStatus, checkTabAccess } = useSubscriptionAccess();

  const chartAccess = checkTabAccess('/charts');
  const canShowAdvanced = chartAccess.hasAccess;
  const loading = state === 'loading';
  const isDegraded = state === 'degraded';

  useEffect(() => {
    getCurrentUserWorkspace().then(id => id && setWorkspaceId(id));
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !candleData.length) return;

    // Initialize chart only once
    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
        layout: { 
          background: { color: 'transparent' },
          textColor: 'hsl(var(--foreground))'
        },
        rightPriceScale: { 
          borderColor: 'hsl(var(--border))' 
        },
        timeScale: { 
          borderColor: 'hsl(var(--border))',
          timeVisible: true,
          secondsVisible: false
        },
        grid: {
          vertLines: { color: 'hsl(var(--border) / 0.1)' },
          horzLines: { color: 'hsl(var(--border) / 0.1)' }
        }
      });

      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: 'hsl(var(--chart-1))',
        downColor: 'hsl(var(--chart-2))',
        borderVisible: true,
        borderUpColor: 'hsl(var(--chart-1))',
        borderDownColor: 'hsl(var(--chart-2))',
        wickUpColor: 'hsl(var(--chart-1))',
        wickDownColor: 'hsl(var(--chart-2))'
      });
      candleSeriesRef.current = candleSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Time sync for linked charts
      chart.timeScale().subscribeVisibleTimeRangeChange((newRange) => {
        if (linked && newRange) {
          setRange({ from: newRange.from as number, to: newRange.to as number });
        }
      });

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    }
  }, [chartContainerRef, height]);

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !candleData.length) return;

    const chartData = candleData.map(candle => ({
      time: Math.floor(new Date(candle.ts).getTime() / 1000) as any,
      open: Number(candle.o),
      high: Number(candle.h),
      low: Number(candle.l),
      close: Number(candle.c),
    }));

    candleSeriesRef.current.setData(chartData);
  }, [candleData]);

  // Update volume
  useEffect(() => {
    if (!chartRef.current || !showVolume || !candleData.length) return;

    // Remove old volume series
    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
    }

    const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
      color: 'hsl(var(--chart-3) / 0.3)',
      priceScaleId: 'volume',
    });

    chartRef.current.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    const volumeData = candleData.map(candle => ({
      time: Math.floor(new Date(candle.ts).getTime() / 1000) as any,
      value: Number(candle.v || 0),
      color: Number(candle.c) >= Number(candle.o) ? 'hsl(var(--chart-1) / 0.6)' : 'hsl(var(--chart-2) / 0.3)',
    }));

    volumeSeries.setData(volumeData);
    volumeSeriesRef.current = volumeSeries;
  }, [candleData, showVolume]);

  // Update oracle indicators
  useEffect(() => {
    if (!chartRef.current || !showIndicators || !canShowAdvanced || !oracleIndicators.length) return;

    // Group indicators by name
    const indicatorsByName = oracleIndicators.reduce((acc, ind) => {
      if (!acc[ind.name]) acc[ind.name] = [];
      acc[ind.name].push(ind);
      return acc;
    }, {} as Record<string, typeof oracleIndicators>);

    // Clear old indicator series
    indicatorSeriesRef.current.forEach((series) => {
      if (chartRef.current) {
        chartRef.current.removeSeries(series);
      }
    });
    indicatorSeriesRef.current.clear();

    // Add new indicator series
    Object.entries(indicatorsByName).forEach(([name, data], idx) => {
      if (!chartRef.current) return;

      const colors = [
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
        'hsl(var(--accent))',
      ];

      const series = chartRef.current.addSeries(LineSeries, {
        color: colors[idx % colors.length],
        lineWidth: 2,
      });

      const lineData = data
        .filter(d => d.value !== null)
        .map(d => ({
          time: Math.floor(new Date(d.ts).getTime() / 1000) as any,
          value: d.value!,
        }));

      series.setData(lineData);
      indicatorSeriesRef.current.set(name, series);
    });
  }, [oracleIndicators, showIndicators, canShowAdvanced]);

  // Apply linked time range
  useEffect(() => {
    if (!chartRef.current || !linked || !range) return;
    chartRef.current.timeScale().setVisibleRange({
      from: range.from as any,
      to: range.to as any,
    });
  }, [linked, range]);

  const handleExport = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.takeScreenshot();
      const link = document.createElement('a');
      link.download = `${symbol}_${timeframe}_chart.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const toggleIndicator = (indicator: keyof typeof activeIndicators) => {
    setActiveIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  if (loading && !candleData.length) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Degraded mode banner */}
      {isDegraded && lastUpdated && (
        <div className="absolute top-2 right-2 z-10 text-xs px-2 py-1 bg-amber-500/15 border border-amber-400/30 rounded">
          Degraded: {format(lastUpdated, 'HH:mm:ss')}
        </div>
      )}

      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{symbol}</CardTitle>
              <Badge variant="outline">{timeframe}</Badge>
              {state === 'degraded' && (
                <Badge variant="secondary" className="text-xs bg-amber-500/20">
                  CACHED
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {canShowAdvanced && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleIndicator('sma20')}
                    className={activeIndicators.sma20 ? 'bg-primary text-primary-foreground' : ''}
                  >
                    SMA20
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleIndicator('vwap')}
                    className={activeIndicators.vwap ? 'bg-accent text-accent-foreground' : ''}
                  >
                    VWAP
                  </Button>
                </>
              )}
              
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <div
          ref={chartContainerRef}
          style={{ height: `${height}px` }}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
};