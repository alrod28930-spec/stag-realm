import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp } from 'lucide-react';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { SymbolSearchInput } from '@/components/market/SymbolSearchInput';
import TierComplianceGuard from '@/components/compliance/TierComplianceGuard';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('candlestick');

  return (
    <TierComplianceGuard requiredTier="pro" feature="CHARTS_ADVANCED">
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Advanced Charts
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze any company's trading data with professional charting tools
          </p>
        </div>

        {/* Chart Controls */}
        <div className="mb-6 space-y-4">
          {/* Symbol Selection */}
          <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <Button
                variant={selectedSymbol === 'AAPL' ? 'default' : 'outline'}
                onClick={() => setSelectedSymbol('AAPL')}
                size="sm"
              >
                AAPL
              </Button>
              <Button
                variant={selectedSymbol === 'MSFT' ? 'default' : 'outline'}
                onClick={() => setSelectedSymbol('MSFT')}
                size="sm"
              >
                MSFT
              </Button>
              <Button
                variant={selectedSymbol === 'GOOGL' ? 'default' : 'outline'}
                onClick={() => setSelectedSymbol('GOOGL')}
                size="sm"
              >
                GOOGL
              </Button>
              <Button
                variant={selectedSymbol === 'SPY' ? 'default' : 'outline'}
                onClick={() => setSelectedSymbol('SPY')}
                size="sm"
              >
                SPY
              </Button>
            </div>
            <SymbolSearchInput 
              onSymbolSelect={(symbol, symbolInfo) => {
                setSelectedSymbol(symbol);
                console.log('Selected symbol info:', symbolInfo);
              }}
              placeholder="Search any symbol..."
              className="flex-1"
              selectedSymbol={selectedSymbol}
            />
          </div>

          {/* Chart Configuration */}
          <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Timeframe:</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1m</SelectItem>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="1D">1D</SelectItem>
                  <SelectItem value="1W">1W</SelectItem>
                  <SelectItem value="1M">1M</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Chart Type:</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Chart Display */}
        <div className="flex-1 relative">
          {selectedSymbol ? (
            <CandlestickChart
              symbol={selectedSymbol}
              timeframe={timeframe}
              height={600}
              showControls={true}
              showIndicators={true}
              showVolume={true}
              showOracleSignals={true}
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