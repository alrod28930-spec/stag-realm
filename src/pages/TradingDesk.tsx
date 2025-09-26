import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ManualOrderCard } from '@/components/tradingdesk/ManualOrderCard';
import { BotExecutionPanel } from '@/components/tradingdesk/BotExecutionPanel';
import { BotCreationWizard } from '@/components/tradingdesk/BotCreationWizard';
import { KpiRow } from '@/components/tradingdesk/KpiRow';
import { AllocationsCard } from '@/components/tradingdesk/AllocationsCard';
import { HitRateCard } from '@/components/tradingdesk/HitRateCard';
import { DailyTradesCard } from '@/components/tradingdesk/DailyTradesCard';
import { OpenPositionsTable } from '@/components/tradingdesk/OpenPositionsTable';
import { OrderHistoryTable } from '@/components/tradingdesk/OrderHistoryTable';
import { ComplianceFooter } from '@/components/tradingdesk/ComplianceFooter';
import TierComplianceGuard from '@/components/compliance/TierComplianceGuard';
import { SymbolIntegrationButton } from '@/components/tradingdesk/SymbolIntegrationButton';
import TradeBots from '@/pages/TradeBots';
import { PaperTradingTestPanel } from '@/components/tradingdesk/PaperTradingTestPanel';
import { SystemAuditPanel } from '@/components/debug/SystemAuditPanel';
import { Bot } from 'lucide-react';
import { DemoDisclaimer } from '@/components/demo/DemoDisclaimer';
import { MarketTracker } from '@/components/market/MarketTracker';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import { RiskDisclaimerBanner, FloatingRiskIndicator } from '@/components/compliance/RiskDisclaimerBanner';
import { RiskAwareTradePanel } from '@/components/tradingdesk/RiskAwareTradePanel';
import { LiveTradingPanel } from '@/components/tradingdesk/LiveTradingPanel';
import { MultiChartPanel } from '@/components/charts/MultiChartPanel';
import { OrderTicket } from '@/components/tradingdesk/OrderTicket';
import { IntradayEquityCurve } from '@/components/charts/IntradayEquityCurve';
import { useDemoMode } from '@/utils/demoMode';
import { SymbolSearchInput } from '@/components/market/SymbolSearchInput';

export default function TradingDesk() {
  const { isDemoMode } = useDemoMode();
  const [selectedChartSymbol, setSelectedChartSymbol] = useState('AAPL');

  return (
    <TierComplianceGuard requiresLiveTrading={true}>
      <div className="space-y-6">
        {/* Risk Disclaimer Banner */}
        <RiskDisclaimerBanner />
        
        {/* Demo Disclaimer */}
        {isDemoMode && (
          <DemoDisclaimer feature="Trading Desk" />
        )}
        
        {/* Floating Risk Indicator */}
        <FloatingRiskIndicator />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              Trading Desk
              {isDemoMode && <DemoModeIndicator variant="badge" className="ml-3" />}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isDemoMode 
                ? "Explore live trading and automated bot features with simulated data"
                : "Execute live trades manually or deploy automated trading bots"
              }
            </p>
          </div>
        <div className="flex items-center gap-2">
          <SymbolIntegrationButton 
            symbol="AAPL" 
            context={{ price: 150.25, direction: 'buy' }}
          />
          <SymbolIntegrationButton 
            symbol="TSLA" 
            context={{ price: 250.75, direction: 'sell' }}
          />
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="manual" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="grid w-full grid-cols-6 min-w-max">
            <TabsTrigger value="manual">Live Trading</TabsTrigger>
            <TabsTrigger value="positions">Open Positions</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Bot className="w-4 h-4" />
              Trade Bots
            </TabsTrigger>
            <TabsTrigger value="testing">System Testing</TabsTrigger>
            <TabsTrigger value="audit">System Audit</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="manual" className="space-y-6">
          {/* Symbol Selection */}
          <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">AAPL</Button>
              <Button variant="outline" size="sm">SPY</Button>
              <Button variant="outline" size="sm">TSLA</Button>
              <Button variant="outline" size="sm">QQQ</Button>
            </div>
            <SymbolSearchInput 
              onSymbolSelect={(symbol, symbolInfo) => {
                console.log('Selected symbol:', symbol, symbolInfo);
                // TODO: Add symbol to chart panel or create new chart
                setSelectedChartSymbol(symbol);
              }}
              placeholder="Search any symbol..."
              className="flex-1"
              selectedSymbol={selectedChartSymbol}
            />
          </div>
          
          {/* Trading Charts */}
          <MultiChartPanel 
            defaultSymbols={[selectedChartSymbol, 'SPY', 'QQQ']}
            maxCharts={4}
            onOrderPlace={(order) => {
              console.log('Order placed from chart:', order);
              // Handle order placement
            }}
            allowDOMView={true}
            key={selectedChartSymbol} // Force re-render when symbol changes
          />
          
          {/* Trading Metrics */}
          <DailyTradesCard />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <MarketTracker />
            <AllocationsCard />
            <HitRateCard />
            <ManualOrderCard />
          </div>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <OpenPositionsTable />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OrderHistoryTable />
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <BotCreationWizard onBotCreated={() => {}} />
              <BotExecutionPanel />
            </div>
            <LiveTradingPanel isDemo={isDemoMode} />
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <PaperTradingTestPanel />
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-6">
          <SystemAuditPanel />
        </TabsContent>
      </Tabs>

        {/* Compliance Footer */}
        <ComplianceFooter />
      </div>
    </TierComplianceGuard>
  );
}