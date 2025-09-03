import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ManualOrderCard } from '@/components/tradingdesk/ManualOrderCard';
import { BotExecutionPanel } from '@/components/tradingdesk/BotExecutionPanel';
import { KpiRow } from '@/components/tradingdesk/KpiRow';
import { AllocationsCard } from '@/components/tradingdesk/AllocationsCard';
import { HitRateCard } from '@/components/tradingdesk/HitRateCard';
import { DailyTradesCard } from '@/components/tradingdesk/DailyTradesCard';
import { OpenPositionsTable } from '@/components/tradingdesk/OpenPositionsTable';
import { OrderHistoryTable } from '@/components/tradingdesk/OrderHistoryTable';
import { ComplianceFooter } from '@/components/tradingdesk/ComplianceFooter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TradingDesk() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Desk</h1>
          <p className="text-muted-foreground mt-2">
            Place manual trades and monitor live performance metrics
          </p>
        </div>
      </div>

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

      {/* Tables Section */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <OpenPositionsTable />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OrderHistoryTable />
        </TabsContent>
      </Tabs>

      {/* Compliance Footer */}
      <ComplianceFooter />
    </div>
  );
}