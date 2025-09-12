import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SymbolRail } from '@/components/charts/SymbolRail';
import { ChartCanvasGrid } from '@/components/charts/ChartCanvasGrid';
import { IndicatorMenu } from '@/components/charts/IndicatorMenu';
import { TradeContextDrawer } from '@/components/charts/TradeContextDrawer';
import { ConnectionStatusBar } from '@/components/charts/ConnectionStatusBar';
import { useChartState } from '@/hooks/useChartState';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Grid, 
  BarChart3, 
  Layers, 
  Settings,
  AlertTriangle 
} from 'lucide-react';

const Charts = () => {
  const {
    selectedSymbol,
    timeframe,
    chartType,
    layout,
    indicators,
    oracleOverlayEnabled,
    setSelectedSymbol,
    setTimeframe,
    setChartType,
    setLayout,
    toggleIndicator,
    toggleOracleOverlay
  } = useChartState();

  const { portfolio, isConnected } = usePortfolioStore();
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Initialize with first position if available
  useEffect(() => {
    if (!selectedSymbol && portfolio?.positions?.length > 0) {
      setSelectedSymbol(portfolio.positions[0].symbol);
    }
  }, [portfolio, selectedSymbol, setSelectedSymbol]);

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Broker Connection Required</h3>
          <p className="text-muted-foreground mb-4">
            Connect to your brokerage account to access live charts and trading.
          </p>
          <Button onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Rail - Symbol Picker */}
      <div className="w-80 border-r border-border bg-card/50">
        <SymbolRail 
          selectedSymbol={selectedSymbol}
          onSymbolSelect={setSelectedSymbol}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Symbol & Price */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedSymbol || 'Select Symbol'}
                </h2>
                {selectedSymbol && (
                  <Badge variant="outline" className="text-success">
                    Live
                  </Badge>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Timeframe Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Timeframe:</span>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1m</SelectItem>
                    <SelectItem value="5m">5m</SelectItem>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1D">1D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candle">Candle</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="heikin">Heikin Ashi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Layout Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Layout:</span>
                <div className="flex rounded-md border border-border">
                  {(['1', '2', '4'] as const).map((layoutType) => (
                    <Button
                      key={layoutType}
                      variant="ghost"
                      size="sm"
                      className={`px-3 rounded-none ${
                        layout === layoutType 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setLayout(layoutType)}
                    >
                      <Grid className="w-4 h-4" />
                      {layoutType}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Indicator Menu */}
              <IndicatorMenu 
                indicators={indicators}
                onToggleIndicator={toggleIndicator}
              />

              {/* Oracle Overlay Toggle */}
              <Button
                variant={oracleOverlayEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleOracleOverlay}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Oracle Signals
              </Button>

              {/* Trade Drawer Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Trade Panel
              </Button>
            </div>
          </div>
        </div>

        {/* Chart Grid & Trade Drawer */}
        <div className="flex-1 flex">
          {/* Chart Canvas */}
          <div className="flex-1 min-w-0">
            <ChartCanvasGrid 
              symbol={selectedSymbol}
              timeframe={timeframe}
              chartType={chartType}
              layout={layout}
              indicators={indicators}
              oracleOverlayEnabled={oracleOverlayEnabled}
            />
          </div>

          {/* Trade Context Drawer */}
          {isDrawerOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-l border-border bg-card/50"
            >
              <TradeContextDrawer 
                symbol={selectedSymbol}
                onClose={() => setIsDrawerOpen(false)}
              />
            </motion.div>
          )}
        </div>

        {/* Footer Status Bar */}
        <ConnectionStatusBar />
      </div>
    </div>
  );
};

export default Charts;