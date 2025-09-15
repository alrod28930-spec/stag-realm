import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  Calendar,
  Activity,
  Zap,
  TestTube
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BacktestResult {
  id: string;
  strategyName: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  equityCurve: { date: string; value: number; drawdown: number }[];
  trades: {
    date: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    pnl: number;
  }[];
  status: 'running' | 'completed' | 'failed';
  progress: number;
}

interface StrategyTestingProps {
  onStrategyTest?: (params: any) => void;
}

export function StrategyTesting({ onStrategyTest }: StrategyTestingProps) {
  const [testResults, setTestResults] = useState<BacktestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

  // Demo strategy parameters
  const [strategyParams, setStrategyParams] = useState({
    name: 'Moving Average Crossover',
    symbol: 'AAPL',
    startDate: '2023-01-01',
    endDate: '2024-01-01',
    initialCapital: 100000,
    fastMA: 20,
    slowMA: 50,
    stopLoss: 2,
    takeProfit: 6
  });

  const runBacktest = async () => {
    const testId = Date.now().toString();
    const newTest: BacktestResult = {
      id: testId,
      ...strategyParams,
      strategyName: strategyParams.name,
      finalCapital: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      equityCurve: [],
      trades: [],
      status: 'running',
      progress: 0
    };

    setTestResults(prev => [newTest, ...prev]);
    setRunningTests(prev => new Set([...prev, testId]));

    // Simulate backtest execution
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, progress }
          : test
      ));
    }

    // Generate demo results
    const finalCapital = strategyParams.initialCapital * (1 + (Math.random() * 0.4 - 0.1));
    const totalReturn = finalCapital - strategyParams.initialCapital;
    const totalReturnPercent = (totalReturn / strategyParams.initialCapital) * 100;
    
    // Generate equity curve
    const equityCurve = [];
    let currentValue = strategyParams.initialCapital;
    let maxValue = currentValue;
    const days = 252; // Trading days in a year
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(2023, 0, 1 + i).toISOString().split('T')[0];
      const randomChange = (Math.random() - 0.5) * 0.02;
      currentValue *= (1 + randomChange);
      maxValue = Math.max(maxValue, currentValue);
      const drawdown = ((maxValue - currentValue) / maxValue) * 100;
      
      equityCurve.push({
        date,
        value: currentValue,
        drawdown
      });
    }

    const completedTest: BacktestResult = {
      ...newTest,
      finalCapital,
      totalReturn,
      totalReturnPercent,
      sharpeRatio: 1.2 + Math.random() * 0.8,
      maxDrawdown: Math.max(...equityCurve.map(e => e.drawdown)),
      winRate: 55 + Math.random() * 20,
      totalTrades: Math.floor(50 + Math.random() * 100),
      avgWin: 150 + Math.random() * 200,
      avgLoss: -(75 + Math.random() * 100),
      profitFactor: 1.1 + Math.random() * 0.8,
      equityCurve,
      trades: [], // Would be populated with actual trades
      status: 'completed',
      progress: 100
    };

    setTestResults(prev => prev.map(test => 
      test.id === testId ? completedTest : test
    ));
    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(testId);
      return newSet;
    });

    if (!selectedResult) {
      setSelectedResult(completedTest);
    }
  };

  const getReturnColor = (returnPercent: number) => {
    return returnPercent >= 0 ? 'text-accent' : 'text-destructive';
  };

  const getReturnIcon = (returnPercent: number) => {
    return returnPercent >= 0 ? 
      <TrendingUp className="w-4 h-4 text-accent" /> : 
      <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Strategy Configuration */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Strategy Testing Framework
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Strategy Name</label>
              <Input
                value={strategyParams.name}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Symbol</label>
              <Input
                value={strategyParams.symbol}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={strategyParams.startDate}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={strategyParams.endDate}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, endDate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Initial Capital</label>
              <Input
                type="number"
                value={strategyParams.initialCapital}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, initialCapital: parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fast MA</label>
              <Input
                type="number"
                value={strategyParams.fastMA}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, fastMA: parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slow MA</label>
              <Input
                type="number"
                value={strategyParams.slowMA}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, slowMA: parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stop Loss %</label>
              <Input
                type="number"
                step="0.1"
                value={strategyParams.stopLoss}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Take Profit %</label>
              <Input
                type="number"
                step="0.1"
                value={strategyParams.takeProfit}
                onChange={(e) => setStrategyParams(prev => ({ ...prev, takeProfit: parseFloat(e.target.value) }))}
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={runBacktest} disabled={runningTests.size > 0} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Run Backtest
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div 
                    key={result.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedResult?.id === result.id ? 'bg-primary/20' : 'bg-muted/20 hover:bg-muted/30'
                    }`}
                    onClick={() => result.status === 'completed' && setSelectedResult(result)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{result.strategyName}</div>
                      <Badge variant={result.status === 'completed' ? 'default' : 'outline'}>
                        {result.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {result.symbol} • {result.startDate} to {result.endDate}
                    </div>

                    {result.status === 'running' && (
                      <div className="mt-2">
                        <Progress value={result.progress} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.progress}% complete
                        </div>
                      </div>
                    )}

                    {result.status === 'completed' && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {getReturnIcon(result.totalReturnPercent)}
                          <span className={`font-medium ${getReturnColor(result.totalReturnPercent)}`}>
                            {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.totalTrades} trades
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        {selectedResult && (
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Metrics */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getReturnColor(selectedResult.totalReturnPercent)}`}>
                      {selectedResult.totalReturnPercent >= 0 ? '+' : ''}{selectedResult.totalReturnPercent.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedResult.sharpeRatio.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">
                      -{selectedResult.maxDrawdown.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedResult.winRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">{selectedResult.totalTrades}</div>
                    <div className="text-sm text-muted-foreground">Total Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">
                      ${selectedResult.avgWin.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Win</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-destructive">
                      ${selectedResult.avgLoss.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Loss</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{selectedResult.profitFactor.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Profit Factor</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equity Curve */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedResult.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}