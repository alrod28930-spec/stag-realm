import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ManualOrderCard } from '@/components/tradingdesk/ManualOrderCard';
import { BotExecutionPanel } from '@/components/tradingdesk/BotExecutionPanel';
import { KpiRow } from '@/components/tradingdesk/KpiRow';
import { AllocationsCard } from '@/components/tradingdesk/AllocationsCard';
import { HitRateCard } from '@/components/tradingdesk/HitRateCard';
import { DailyTradesCard } from '@/components/tradingdesk/DailyTradesCard';
import { OpenPositionsTable } from '@/components/tradingdesk/OpenPositionsTable';
import { OrderHistoryTable } from '@/components/tradingdesk/OrderHistoryTable';
import { ComplianceFooter } from '@/components/tradingdesk/ComplianceFooter';
import { SymbolIntegrationButton } from '@/components/tradingdesk/SymbolIntegrationButton';
import TradeBots from '@/pages/TradeBots';
import { PaperTradingTestPanel } from '@/components/tradingdesk/PaperTradingTestPanel';
import { SystemAuditPanel } from '@/components/debug/SystemAuditPanel';
import { Bot } from 'lucide-react';
import { DemoDisclaimer } from '@/components/demo/DemoDisclaimer';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import { useDemoMode } from '@/utils/demoMode';

export default function TradingDesk() {
  const { isDemoMode } = useDemoMode();

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      {isDemoMode && (
        <DemoDisclaimer feature="Trading Desk" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            Trading Desk
            {isDemoMode && <DemoModeIndicator variant="badge" className="ml-3" />}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isDemoMode 
              ? "Explore manual trading and automated bot features with simulated data"
              : "Execute trades manually and manage automated trading bots"
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
            <TabsTrigger value="manual">Manual Trading</TabsTrigger>
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel - Manual Order */}
            <div className="lg:col-span-1">
              <ManualOrderCard />
            </div>

            {/* Center Panel - Bot Execution */}
            <div className="lg:col-span-2">
              <BotExecutionPanel />
            </div>

            {/* Right Panel - Performance Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {/* KPI Header */}
              <KpiRow />

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 gap-4">
                <AllocationsCard />
                <HitRateCard />
                <DailyTradesCard />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <OpenPositionsTable />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OrderHistoryTable />
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          <div className="h-screen overflow-hidden">
            <TradeBots />
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
  );
}