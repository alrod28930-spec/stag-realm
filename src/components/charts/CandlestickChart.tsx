import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { useChartData, CandleData, IndicatorData, OracleSignal } from '@/hooks/useChartData';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

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
  
  const [activeIndicators, setActiveIndicators] = useState({
    sma20: true,
    rsi14: false,
    macd: false,
    vwap: false
  });

  const { candleData, indicatorData, oracleSignals, loading, error, isDemo } = useChartData(symbol, timeframe);
  const { subscriptionStatus, checkTabAccess } = useSubscriptionAccess();

  const chartAccess = checkTabAccess('/charts');
  const canShowAdvanced = chartAccess.hasAccess;

  useEffect(() => {
    if (!chartContainerRef.current || !candleData.length) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: { background: { color: 'transparent' } },
      rightPriceScale: { borderColor: '#ccc' },
      timeScale: { borderColor: '#ccc' },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });
    candleSeriesRef.current = candleSeries;

    // Set candle data
    const chartData = candleData.map(candle => ({
      time: Math.floor(candle.time / 1000) as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(chartData);

    // Add volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(128, 128, 128, 0.3)',
        priceScaleId: 'volume',
      });

      volumeSeriesRef.current = volumeSeries;
      
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });

      const volumeData = candleData.map(candle => ({
        time: Math.floor(candle.time / 1000) as any,
        value: candle.volume,
        color: candle.close >= candle.open ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
      }));

      volumeSeries.setData(volumeData);
    }

    // Add indicators if enabled and user has access
    if (showIndicators && canShowAdvanced && indicatorData.length) {
      // SMA20
      if (activeIndicators.sma20) {
        const sma20Series = chart.addSeries(LineSeries, {
          color: 'rgb(59, 130, 246)',
          lineWidth: 2,
        });

        const sma20Data = indicatorData
          .filter(ind => ind.sma20 !== undefined)
          .map(ind => ({
            time: Math.floor(ind.time / 1000) as any,
            value: ind.sma20!,
          }));

        sma20Series.setData(sma20Data);
      }

      // VWAP
      if (activeIndicators.vwap) {
        const vwapSeries = chart.addSeries(LineSeries, {
          color: 'rgb(168, 85, 247)',
          lineWidth: 2,
        });

        const vwapData = indicatorData
          .filter(ind => ind.vwap !== undefined)
          .map(ind => ({
            time: Math.floor(ind.time / 1000) as any,
            value: ind.vwap!,
          }));

        vwapSeries.setData(vwapData);
      }
    }

    // Add oracle signals as markers if enabled (commented out - not supported in current version)
    // if (showOracleSignals && oracleSignals.length) {
    //   console.log('Oracle signals available:', oracleSignals.length);
    // }

    // Handle resize
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
  }, [candleData, indicatorData, oracleSignals, activeIndicators, height, showVolume, showIndicators, showOracleSignals, canShowAdvanced]);

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

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{symbol}</CardTitle>
              <Badge variant="outline">{timeframe}</Badge>
              {isDemo && (
                <Badge variant="secondary" className="text-xs">
                  DEMO
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