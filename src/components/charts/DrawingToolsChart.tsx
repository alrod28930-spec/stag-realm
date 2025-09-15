import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2,
  TrendingUp,
  Minus,
  Square,
  Circle,
  Triangle,
  Ruler,
  Target,
  Bell,
  Trash2,
  Save,
  Download,
  Layers
} from 'lucide-react';
import { useChartData } from '@/hooks/useChartData';
import { useToast } from '@/hooks/use-toast';

interface DrawingTool {
  id: string;
  type: 'trendline' | 'horizontal' | 'rectangle' | 'fibonacci' | 'support' | 'resistance';
  points: Array<{ x: number; y: number; time: number; price: number }>;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  label?: string;
}

interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  enabled: boolean;
  created: number;
  triggered?: boolean;
}

interface DrawingToolsChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  onAlertTrigger?: (alert: PriceAlert) => void;
}

export const DrawingToolsChart: React.FC<DrawingToolsChartProps> = ({
  symbol,
  timeframe = '5m',
  height = 500,
  onAlertTrigger
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeTool, setActiveTool] = useState<string>('cursor');
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<DrawingTool> | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [selectedStyle, setSelectedStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [selectedThickness, setSelectedThickness] = useState(2);

  const { candleData, indicatorData, loading } = useChartData(symbol, timeframe);
  const { toast } = useToast();

  const drawingTools = [
    { id: 'cursor', label: 'Cursor', icon: MousePointer2 },
    { id: 'trendline', label: 'Trend Line', icon: TrendingUp },
    { id: 'horizontal', label: 'Horizontal Line', icon: Minus },
    { id: 'rectangle', label: 'Rectangle', icon: Square },
    { id: 'fibonacci', label: 'Fibonacci', icon: Ruler },
    { id: 'support', label: 'Support', icon: Target },
    { id: 'resistance', label: 'Resistance', icon: Target }
  ];

  const colors = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#22c55e', label: 'Green' },
    { value: '#f59e0b', label: 'Yellow' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#06b6d4', label: 'Cyan' }
  ];

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
        secondsVisible: false
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

    // Set data
    const chartData = candleData.map(candle => ({
      time: Math.floor(candle.time / 1000) as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(chartData);

    // Add VWAP if available
    if (indicatorData.length > 0) {
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
    }

    // Chart click handler for drawing tools
    chart.subscribeClick((param) => {
      if (activeTool === 'cursor' || !param.point) return;

      const price = candleSeries.coordinateToPrice(param.point.y);
      const time = param.time as number;

      if (price === null || time === null) return;

      handleChartClick({
        x: param.point.x,
        y: param.point.y,
        price,
        time: time * 1000 // Convert back to milliseconds
      });
    });

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
  }, [candleData, indicatorData, activeTool]);

  const handleChartClick = useCallback((point: { x: number; y: number; price: number; time: number }) => {
    if (activeTool === 'cursor') return;

    if (!isDrawing) {
      // Start new drawing
      const newDrawing: Partial<DrawingTool> = {
        id: Date.now().toString(),
        type: activeTool as any,
        points: [point],
        color: selectedColor,
        style: selectedStyle,
        thickness: selectedThickness
      };

      setCurrentDrawing(newDrawing);
      setIsDrawing(true);

      // For single-click tools
      if (activeTool === 'horizontal' || activeTool === 'support' || activeTool === 'resistance') {
        completeDrawing(newDrawing);
      }
    } else {
      // Complete drawing
      if (currentDrawing) {
        const completedDrawing = {
          ...currentDrawing,
          points: [...currentDrawing.points!, point]
        } as DrawingTool;

        completeDrawing(completedDrawing);
      }
    }
  }, [activeTool, isDrawing, currentDrawing, selectedColor, selectedStyle, selectedThickness]);

  const completeDrawing = (drawing: Partial<DrawingTool>) => {
    if (drawing.points && drawing.points.length >= 1) {
      setDrawings(prev => [...prev, drawing as DrawingTool]);
      setCurrentDrawing(null);
      setIsDrawing(false);
      setActiveTool('cursor');

      toast({
        title: "Drawing Added",
        description: `${drawing.type} drawing has been added to the chart`,
      });
    }
  };

  const removeDrawing = (id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
  };

  const clearAllDrawings = () => {
    setDrawings([]);
    toast({
      title: "Drawings Cleared",
      description: "All drawings have been removed from the chart",
    });
  };

  const addPriceAlert = (price: number, condition: 'above' | 'below') => {
    const alert: PriceAlert = {
      id: Date.now().toString(),
      symbol,
      price,
      condition,
      enabled: true,
      created: Date.now()
    };

    setAlerts(prev => [...prev, alert]);
    
    toast({
      title: "Price Alert Added",
      description: `Alert set for ${symbol} ${condition} $${price.toFixed(2)}`,
    });
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const saveDrawings = () => {
    const data = {
      symbol,
      timeframe,
      drawings,
      alerts,
      timestamp: Date.now()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_${timeframe}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChart = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.takeScreenshot();
      const link = document.createElement('a');
      link.download = `${symbol}_${timeframe}_chart.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{symbol} Technical Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{timeframe}</Badge>
            <Badge variant="outline">{drawings.length} Drawings</Badge>
            <Badge variant="outline">{alerts.length} Alerts</Badge>
          </div>
        </div>

        {/* Drawing Tools Toolbar */}
        <div className="space-y-3">
          {/* Tool Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            {drawingTools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveTool(tool.id);
                  setIsDrawing(false);
                  setCurrentDrawing(null);
                }}
                className="text-xs"
              >
                <tool.icon className="w-3 h-3 mr-1" />
                {tool.label}
              </Button>
            ))}
          </div>

          {/* Style Controls */}
          <div className="flex items-center gap-4">
            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Color:</span>
              <div className="flex gap-1">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    className={`w-6 h-6 rounded border-2 ${
                      selectedColor === color.value ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Line Style */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Style:</span>
              <Select value={selectedStyle} onValueChange={(value: any) => setSelectedStyle(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Thickness */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Thickness:</span>
              <Select value={selectedThickness.toString()} onValueChange={(value) => setSelectedThickness(parseInt(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1px</SelectItem>
                  <SelectItem value="2">2px</SelectItem>
                  <SelectItem value="3">3px</SelectItem>
                  <SelectItem value="4">4px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Actions */}
            <Button variant="outline" size="sm" onClick={clearAllDrawings}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            
            <Button variant="outline" size="sm" onClick={saveDrawings}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportChart}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={chartContainerRef}
          style={{ height: `${height}px` }}
          className={`w-full ${activeTool !== 'cursor' ? 'cursor-crosshair' : 'cursor-default'}`}
        />
      </CardContent>

      {/* Status Bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              Tool: <span className="text-foreground">{drawingTools.find(t => t.id === activeTool)?.label}</span>
            </span>
            {isDrawing && (
              <span className="text-warning">
                {activeTool === 'trendline' || activeTool === 'fibonacci' ? 'Click to complete drawing' : 'Drawing...'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span>Drawings: {drawings.length}</span>
            <span>Alerts: {alerts.filter(a => a.enabled).length} active</span>
          </div>
        </div>
      </div>

      {/* Drawings List (if any) */}
      {drawings.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-xs space-y-1">
            <span className="text-muted-foreground">Active Drawings:</span>
            {drawings.slice(-3).map((drawing) => (
              <div key={drawing.id} className="flex items-center justify-between text-xs bg-muted/20 rounded px-2 py-1">
                <span className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded"
                    style={{ backgroundColor: drawing.color }}
                  />
                  {drawing.type}
                  {drawing.label && ` - ${drawing.label}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDrawing(drawing.id)}
                  className="h-4 w-4 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};