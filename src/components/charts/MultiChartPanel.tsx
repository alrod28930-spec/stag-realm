import React, { useState, useRef, useEffect } from 'react';
import { LiveBotTradeOverlay } from './LiveBotTradeOverlay';
import { ChartTradeMarkers } from './ChartTradeMarkers';
import { useLayoutStore } from '@/stores/layoutStore';
import { useChartPresets } from '@/hooks/useChartPresets';
import { useTimeSync } from '@/hooks/useTimeSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealTimeTradingChart } from './RealTimeTradingChart';
import { OrderBookDOM } from './OrderBookDOM';
import { 
  Grid3X3, 
  Maximize2, 
  Copy, 
  Settings, 
  TrendingUp,
  BarChart3,
  Target,
  Plus,
  X,
  Link,
  RotateCcw,
  Save
} from 'lucide-react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/use-toast';

interface TradeMarker {
  id: string;
  price: number;
  timestamp: Date;
  action: 'buy' | 'sell';
  botName: string;
  quantity: number;
  pnl?: number;
}

interface ChartConfig {
  id: string;
  symbol: string;
  timeframe: string;
  indicators: string[];
  trades?: TradeMarker[];
  deployedBot?: string;
  isAutomated?: boolean;
}

interface MultiChartPanelProps {
  defaultSymbols?: string[];
  maxCharts?: number;
  onOrderPlace?: (order: any) => void;
  allowDOMView?: boolean;
}

export const MultiChartPanel: React.FC<MultiChartPanelProps> = ({
  defaultSymbols = ['AAPL', 'TSLA', 'SPY', 'QQQ'],
  maxCharts = 4,
  onOrderPlace,
  allowDOMView = true
}) => {
  // Use persistent layout store
  const { layout, updateChart: updateLayoutChart, setLayout, load } = useLayoutStore();
  const { presets, applyPreset, addPreset, removePreset } = useChartPresets();
  const { linked, setLinked } = useTimeSync();
  
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  
  const { subscriptionStatus } = useSubscriptionAccess();
  const { toast } = useToast();
  
  const isElite = subscriptionStatus.tier === 'elite';
  const canShowDOM = isElite && allowDOMView;

  // Load saved layout on mount
  useEffect(() => {
    load();
  }, [load]);

  // Map layout store to local format
  const chartLayout = layout.chartLayout;
  const charts: ChartConfig[] = layout.charts.map(c => ({
    ...c,
    trades: [],
  }));
  const selectedChart = layout.selectedChart;

  const timeframes = [
    { label: '1s', value: '1s' },
    { label: '5s', value: '5s' },
    { label: '15s', value: '15s' },
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '1D', value: '1D' }
  ];

  const popularSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'DIA', 'VIX', 'GLD', 'SLV', 'TLT'
  ];

  const availableBots = [
    { id: 'momentum-bot-1', name: 'Momentum Pro', strategy: 'momentum' },
    { id: 'mean-revert-1', name: 'Mean Reversion', strategy: 'mean_reversion' },
    { id: 'breakout-1', name: 'Breakout Hunter', strategy: 'breakout' },
    { id: 'scalping-1', name: 'Quick Scalper', strategy: 'scalping' }
  ];

  const handleChartUpdate = (chartId: string, updates: Partial<ChartConfig>) => {
    updateLayoutChart(chartId, updates);
  };

  const handleBotTradeExecuted = (chartId: string, trade: any) => {
    const tradeMarker: TradeMarker = {
      id: trade.id,
      price: trade.price,
      timestamp: trade.timestamp,
      action: trade.action,
      botName: trade.bot_name,
      quantity: trade.quantity,
      pnl: trade.pnl
    };

    // Trades are transient UI state, not persisted in layout
    // We could add them to a separate store if needed, but for now just log
    console.log('Bot trade executed:', tradeMarker);
  };

  const addChart = () => {
    if (charts.length >= maxCharts) {
      toast({
        title: 'Chart limit reached',
        description: `Maximum ${maxCharts} charts allowed`,
        variant: 'destructive'
      });
      return;
    }

    const newChart = {
      id: Date.now().toString(),
      symbol: 'AAPL',
      timeframe: '5m',
      indicators: ['vwap'],
    };

    setLayout({
      ...layout,
      charts: [...layout.charts, newChart],
    });
  };

  const removeChart = (chartId: string) => {
    if (charts.length <= 1) return;
    setLayout({
      ...layout,
      charts: layout.charts.filter(c => c.id !== chartId),
    });
  };

  const deployBot = (chartId: string, botId: string) => {
    const bot = availableBots.find(b => b.id === botId);
    if (!bot) return;

    updateLayoutChart(chartId, { deployedBot: botId, isAutomated: true });

    toast({
      title: 'Bot Deployed',
      description: `${bot.name} is now trading ${charts.find(c => c.id === chartId)?.symbol}`
    });
  };

  const undeployBot = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart?.deployedBot) return;

    updateLayoutChart(chartId, { deployedBot: undefined, isAutomated: false });

    toast({
      title: 'Bot Stopped',
      description: `Chart switched back to manual mode`
    });
  };

  const syncCharts = () => {
    const selectedChartConfig = charts.find(c => c.id === selectedChart);
    if (!selectedChartConfig) return;

    setLayout({
      ...layout,
      charts: layout.charts.map(c => ({
        ...c,
        timeframe: selectedChartConfig.timeframe,
      })),
    });

    toast({
      title: 'Charts Synchronized',
      description: `All charts set to ${selectedChartConfig.timeframe} timeframe`
    });
  };

  const resetLayout = () => {
    const defaultCharts = [
      { id: '1', symbol: 'SPY', timeframe: '5m', indicators: ['vwap'] },
      { id: '2', symbol: 'QQQ', timeframe: '5m', indicators: ['vwap'] },
      { id: '3', symbol: 'AAPL', timeframe: '1m', indicators: ['vwap'] },
      { id: '4', symbol: 'TSLA', timeframe: '1m', indicators: ['vwap'] },
    ];

    setLayout({
      ...layout,
      charts: defaultCharts,
      chartLayout: '2x2',
      selectedChart: '1',
    });

    toast({
      title: 'Layout Reset',
      description: 'Chart layout restored to default'
    });
  };

  const applyChartPreset = (presetId: string) => {
    const preset = applyPreset(presetId);
    if (!preset) return;

    const newCharts = preset.charts.map((c, idx) => ({
      id: `${Date.now()}-${idx}`,
      ...c,
    }));

    setLayout({
      ...layout,
      charts: newCharts,
      chartLayout: preset.layout,
      selectedChart: newCharts[0]?.id || null,
    });

    toast({
      title: 'Preset Applied',
      description: `Layout set to ${preset.name}`
    });
  };

  const setSelectedChart = (chartId: string) => {
    setLayout({ ...layout, selectedChart: chartId });
  };

  const setChartLayoutGrid = (newLayout: '1x1' | '2x1' | '2x2') => {
    setLayout({ ...layout, chartLayout: newLayout });
  };

  const getLayoutClass = () => {
    switch (chartLayout) {
      case '1x1': return 'grid-cols-1';
      case '2x1': return 'grid-cols-2 grid-rows-1';
      case '2x2': return 'grid-cols-2 grid-rows-2';
      default: return 'grid-cols-2 grid-rows-2';
    }
  };

  const getChartHeight = () => {
    switch (chartLayout) {
      case '1x1': return 600;
      case '2x1': return 500;
      case '2x2': return 350;
      default: return 400;
    }
  };

  const visibleCharts = charts.slice(0, chartLayout === '1x1' ? 1 : chartLayout === '2x1' ? 2 : 4);

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Multi-Chart Trading Panel</CardTitle>
            <div className="flex items-center gap-2">
              {/* Layout Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant={chartLayout === '1x1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartLayoutGrid('1x1')}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant={chartLayout === '2x1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartLayoutGrid('2x1')}
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
                <Button
                  variant={chartLayout === '2x2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartLayoutGrid('2x2')}
                >
                  <BarChart3 className="w-3 h-3 !text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </Button>
              </div>

              {/* Chart Management */}
              <Button
                variant={linked ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setLinked(!linked);
                  toast({
                    title: linked ? 'Charts Unlinked' : 'Charts Linked',
                    description: linked ? 'Charts will scroll independently' : 'Charts will sync zoom/pan'
                  });
                }}
              >
                <Link className="w-4 h-4 mr-1" />
                {linked ? 'Linked' : 'Link'}
              </Button>

              <Button variant="outline" size="sm" onClick={syncCharts}>
                <Copy className="w-4 h-4 mr-1" />
                Sync Time
              </Button>

              <Select onValueChange={applyChartPreset}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Presets" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={resetLayout}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>

              <Button variant="outline" size="sm" onClick={addChart}>
                <Plus className="w-4 h-4 mr-1" />
                Add Chart
              </Button>

              {/* DOM Toggle (Elite only) */}
              {canShowDOM && (
                <Button
                  variant={showOrderBook ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOrderBook(!showOrderBook)}
                >
                  <Target className="w-4 h-4 mr-1" />
                  Level II
                </Button>
              )}
            </div>
          </div>

          {/* Chart Configuration Row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm label-glow-blue">Selected:</span>
              <Select value={selectedChart} onValueChange={setSelectedChart}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleCharts.map((chart) => (
                    <SelectItem key={chart.id} value={chart.id}>
                      Chart {chart.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Symbol Buttons */}
            <div className="flex items-center gap-1">
              {popularSymbols.slice(0, 8).map((symbol) => (
                <Button
                  key={symbol}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2"
                  onClick={() => {
                    if (selectedChart) {
                      handleChartUpdate(selectedChart, { symbol });
                    }
                  }}
                >
                  {symbol}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Charts Grid */}
      <div className="flex gap-4">
        {/* Main Chart Area */}
        <div className={`grid ${getLayoutClass()} gap-4 flex-1`}>
          {visibleCharts.map((chart) => (
            <Card key={chart.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{chart.symbol}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {chart.timeframe}
                    </Badge>
                    {chart.isAutomated && (
                      <Badge variant="default" className="text-xs">
                        {availableBots.find(b => b.id === chart.deployedBot)?.name || 'Bot Active'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Symbol Selector */}
                    <Select 
                      value={chart.symbol} 
                      onValueChange={(symbol) => handleChartUpdate(chart.id, { symbol })}
                    >
                      <SelectTrigger className="w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {popularSymbols.map((symbol) => (
                          <SelectItem key={symbol} value={symbol}>
                            {symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Timeframe Selector */}
                    <Select 
                      value={chart.timeframe} 
                      onValueChange={(timeframe) => handleChartUpdate(chart.id, { timeframe })}
                    >
                      <SelectTrigger className="w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframes.map((tf) => (
                          <SelectItem key={tf.value} value={tf.value}>
                            {tf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Bot Selector */}
                    <Select 
                      value={chart.deployedBot || "manual"} 
                      onValueChange={(botId) => botId !== "manual" ? deployBot(chart.id, botId) : undeployBot(chart.id)}
                    >
                      <SelectTrigger className="w-24 text-xs">
                        <SelectValue placeholder="Manual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        {availableBots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            {bot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Stop Bot Button */}
                    {chart.isAutomated && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => undeployBot(chart.id)}
                        className="w-8 h-6 p-0 text-xs"
                      >
                        Stop
                      </Button>
                    )}

                    {charts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChart(chart.id)}
                        className="w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 relative">
                {/* Live Bot Trade Overlay */}
                <LiveBotTradeOverlay 
                  symbol={chart.symbol}
                  onTradeExecuted={(trade) => handleBotTradeExecuted(chart.id, trade)}
                  isActive={chart.isAutomated}
                  botName={chart.deployedBot ? availableBots.find(b => b.id === chart.deployedBot)?.name : undefined}
                />
                
                {/* Chart Trade Markers */}
                {chart.trades && chart.trades.length > 0 && (
                  <ChartTradeMarkers 
                    trades={chart.trades}
                    chartHeight={getChartHeight()}
                    chartWidth={800} // Default chart width
                    priceRange={{ min: 100, max: 200 }} // Mock price range
                  />
                )}
                
                <RealTimeTradingChart
                  symbol={chart.symbol}
                  timeframe={chart.timeframe}
                  height={getChartHeight()}
                  showSnapTrading={true}
                  enableHotkeys={chart.id === selectedChart}
                  onOrderPlace={onOrderPlace}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Book Panel (Elite only) */}
        {showOrderBook && canShowDOM && (
          <div className="w-80">
            <OrderBookDOM
              symbol={visibleCharts.find(c => c.id === selectedChart)?.symbol || 'AAPL'}
              height={getChartHeight() * (chartLayout === '2x2' ? 2 : 1) + 100}
              onLevelClick={(side, price, size) => {
                const order = {
                  symbol: visibleCharts.find(c => c.id === selectedChart)?.symbol || 'AAPL',
                  side: side === 'bid' ? 'buy' : 'sell',
                  type: 'limit',
                  price,
                  quantity: Math.min(size, 100), // Limit order size for demo
                  timestamp: Date.now()
                };
                onOrderPlace?.(order);
              }}
            />
          </div>
        )}
      </div>

      {/* Chart Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {visibleCharts.map((chart) => (
          <Card key={`stats-${chart.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {chart.symbol} <span className="label-glow-blue">Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="label-glow-blue">Volume:</span>
                <span className="font-mono">1.2M</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="label-glow-blue">VWAP:</span>
                <span className="font-mono">$150.25</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="label-glow-blue">Day Range:</span>
                <span className="font-mono">$148.10 - $151.50</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="label-glow-blue">Spread:</span>
                <span className="font-mono">$0.02</span>
              </div>
              {/* Bot Trading Stats */}
              {chart.trades && chart.trades.length > 0 && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="label-glow-blue">Bot Trades:</span>
                    <span className="font-mono">{chart.trades.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="label-glow-blue">Bot P&amp;L:</span>
                    <span className={`font-mono ${
                      (chart.trades.reduce((sum, t) => sum + (t.pnl || 0), 0)) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ${chart.trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(0)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};