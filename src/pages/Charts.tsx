import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import TierComplianceGuard from '@/components/compliance/TierComplianceGuard';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');

  return (
    <TierComplianceGuard requiredTier="pro" feature="CHARTS_ADVANCED">
      <div className="h-full flex flex-col p-4">
        {/* Chart Controls */}
        <div className="mb-4 flex gap-4 items-center">
          <Button
            variant={selectedSymbol === 'AAPL' ? 'default' : 'outline'}
            onClick={() => setSelectedSymbol('AAPL')}
          >
            AAPL
          </Button>
          <Button
            variant={selectedSymbol === 'MSFT' ? 'default' : 'outline'}
            onClick={() => setSelectedSymbol('MSFT')}
          >
            MSFT
          </Button>
          <Button
            variant={selectedSymbol === 'GOOGL' ? 'default' : 'outline'}
            onClick={() => setSelectedSymbol('GOOGL')}
          >
            GOOGL
          </Button>
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