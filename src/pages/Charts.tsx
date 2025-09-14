import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SymbolRail } from '@/components/charts/SymbolRail';
import { ChartCanvasGrid } from '@/components/charts/ChartCanvasGrid';
import { IndicatorMenu } from '@/components/charts/IndicatorMenu';
import { TradeContextDrawer } from '@/components/charts/TradeContextDrawer';
import { ConnectionStatusBar } from '@/components/charts/ConnectionStatusBar';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useAuthStore } from '@/stores/authStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ChartCanvasGrid } from '@/components/charts/ChartCanvasGrid';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { TierComplianceGuard } from '@/components/compliance/TierComplianceGuard';
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
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Keyboard shortcuts
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
  const currentTimeframeIndex = timeframes.indexOf(timeframe);
  
  const handleNextTimeframe = () => {
    const nextIndex = (currentTimeframeIndex + 1) % timeframes.length;
    setTimeframe(timeframes[nextIndex]);
  };
  
  const handlePrevTimeframe = () => {
    const prevIndex = currentTimeframeIndex === 0 ? timeframes.length - 1 : currentTimeframeIndex - 1;
    setTimeframe(timeframes[prevIndex]);
  };

  const shortcuts = createChartShortcuts({
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onToggleTrade: () => setIsDrawerOpen(!isDrawerOpen),
    onLayout1: () => setLayout('1'),
    onLayout2: () => setLayout('2'),
    onLayout4: () => setLayout('4'),
    onNextTimeframe: handleNextTimeframe,
    onPrevTimeframe: handlePrevTimeframe
  });
  
  useKeyboardShortcuts(shortcuts, { enabled: isAuthenticated });

  // Initialize with first position if available and user is authenticated
  useEffect(() => {
    if (isAuthenticated && !selectedSymbol && portfolio?.positions?.length > 0) {
      setSelectedSymbol(portfolio.positions[0].symbol);
    }
  }, [portfolio, selectedSymbol, setSelectedSymbol, isAuthenticated]);

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
    <TierComplianceGuard requiredTier="pro" feature="CHARTS_ADVANCED">
      <div className="h-full flex flex-col p-4">
        {/* Main Chart Area */}
        <div className="flex-1 relative">
          {selectedSymbol ? (
            <CandlestickChart
              symbol={selectedSymbol}
              timeframe={timeframe}
              height={600}
              showControls={true}
              showIndicators={true}
              showVolume={true}
              showOracleSignals={oracleOverlayEnabled}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Symbol</h3>
                <p className="text-muted-foreground">Choose a symbol to view charts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TierComplianceGuard>
  );
};

export default Charts;