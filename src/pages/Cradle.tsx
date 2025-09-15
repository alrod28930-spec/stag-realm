import { ExcelSpreadsheet } from '@/components/cradle/ExcelSpreadsheet';
import { StrategyTesting } from '@/components/cradle/StrategyTesting';
import { MonteCarloSimulation } from '@/components/cradle/MonteCarloSimulation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, TestTube, Zap } from 'lucide-react';

export default function Cradle() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8" />
            Cradle Spreadsheet Lab
          </h1>
          <p className="text-muted-foreground mt-2">
            Experiment with strategies, analyze data, test with Monte Carlo, and connect formulas to StagAlgo's systems
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="spreadsheet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Spreadsheet
          </TabsTrigger>
          <TabsTrigger value="strategy-testing" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Strategy Testing
          </TabsTrigger>
          <TabsTrigger value="monte-carlo" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Monte Carlo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spreadsheet">
          <ExcelSpreadsheet />
        </TabsContent>

        <TabsContent value="strategy-testing">
          <StrategyTesting />
        </TabsContent>

        <TabsContent value="monte-carlo">
          <MonteCarloSimulation />
        </TabsContent>
      </Tabs>
    </div>
  );
}