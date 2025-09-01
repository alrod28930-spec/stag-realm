import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Baby, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  Beaker,
  Plus,
  Settings,
  BarChart3,
  Target,
  Clock
} from 'lucide-react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'testing' | 'paused' | 'completed' | 'failed';
  progress: number;
  startDate: Date;
  estimatedCompletion: Date;
  currentReturn: number;
  maxDrawdown: number;
  trades: number;
  winRate: number;
  sharpeRatio: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  allocation: number;
}

export default function Cradle() {
  const [activeTab, setActiveTab] = useState('incubating');

  const [strategies] = useState<Strategy[]>([
    {
      id: '1',
      name: 'Adaptive Mean Reversion',
      description: 'Dynamic mean reversion strategy that adapts to market volatility conditions',
      status: 'testing',
      progress: 67,
      startDate: new Date('2024-02-15'),
      estimatedCompletion: new Date('2024-03-15'),
      currentReturn: 8.7,
      maxDrawdown: -3.2,
      trades: 89,
      winRate: 64.2,
      sharpeRatio: 1.34,
      riskLevel: 'Medium',
      allocation: 10000
    },
    {
      id: '2',
      name: 'Volume Profile Breakouts',
      description: 'Identifies breakout opportunities using volume profile analysis',
      status: 'testing',
      progress: 23,
      startDate: new Date('2024-03-01'),
      estimatedCompletion: new Date('2024-04-01'),
      currentReturn: -1.4,
      maxDrawdown: -4.8,
      trades: 34,
      winRate: 41.2,
      sharpeRatio: -0.18,
      riskLevel: 'High',
      allocation: 15000
    },
    {
      id: '3',
      name: 'Multi-Timeframe Momentum',
      description: 'Combines momentum signals across multiple timeframes for entry/exit',
      status: 'completed',
      progress: 100,
      startDate: new Date('2024-01-01'),
      estimatedCompletion: new Date('2024-02-01'),
      currentReturn: 15.3,
      maxDrawdown: -2.1,
      trades: 156,
      winRate: 72.4,
      sharpeRatio: 2.18,
      riskLevel: 'Low',
      allocation: 20000
    },
    {
      id: '4',
      name: 'Options Delta Neutral',
      description: 'Market-neutral strategy using options to capture volatility premium',
      status: 'paused',
      progress: 45,
      startDate: new Date('2024-02-10'),
      estimatedCompletion: new Date('2024-03-10'),
      currentReturn: 3.9,
      maxDrawdown: -1.7,
      trades: 78,
      winRate: 67.9,
      sharpeRatio: 1.89,
      riskLevel: 'Low',
      allocation: 25000
    },
    {
      id: '5',
      name: 'Crypto Arbitrage Bot',
      description: 'Exploits price differences between cryptocurrency exchanges',
      status: 'failed',
      progress: 100,
      startDate: new Date('2024-01-15'),
      estimatedCompletion: new Date('2024-02-15'),
      currentReturn: -12.7,
      maxDrawdown: -18.5,
      trades: 245,
      winRate: 32.7,
      sharpeRatio: -1.45,
      riskLevel: 'High',
      allocation: 5000
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'testing': return 'bg-primary text-primary-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-accent text-accent-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-accent';
      case 'Medium': return 'text-warning';
      case 'High': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'completed': return <Target className="w-3 h-3" />;
      case 'failed': return <TrendingDown className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const filterStrategies = (status: string) => {
    if (status === 'incubating') {
      return strategies.filter(s => s.status === 'testing' || s.status === 'paused');
    }
    if (status === 'completed') {
      return strategies.filter(s => s.status === 'completed');
    }
    if (status === 'failed') {
      return strategies.filter(s => s.status === 'failed');
    }
    return strategies;
  };

  const incubatorStats = {
    totalStrategies: strategies.length,
    activeTests: strategies.filter(s => s.status === 'testing').length,
    completedTests: strategies.filter(s => s.status === 'completed').length,
    avgReturn: strategies.filter(s => s.status === 'completed').length > 0
      ? strategies.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.currentReturn, 0) / strategies.filter(s => s.status === 'completed').length
      : 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Baby className="w-8 h-8" />
            Strategy Cradle
          </h1>
          <p className="text-muted-foreground mt-2">
            Incubate, test, and validate new trading strategies before deployment
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Strategies
            </CardTitle>
            <Beaker className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incubatorStats.totalStrategies}</div>
            <p className="text-xs text-muted-foreground">In development</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tests
            </CardTitle>
            <Play className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incubatorStats.activeTests}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Tests
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incubatorStats.completedTests}</div>
            <p className="text-xs text-muted-foreground">Ready for deployment</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Success Return
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              +{incubatorStats.avgReturn.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Successful strategies</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incubating">
            Incubating ({filterStrategies('incubating').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({filterStrategies('completed').length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({filterStrategies('failed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterStrategies(activeTab).map((strategy) => (
              <Card key={strategy.id} className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                        <Badge className={getStatusColor(strategy.status)}>
                          {getStatusIcon(strategy.status)}
                          <span className="ml-1 capitalize">{strategy.status}</span>
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {strategy.description}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Progress Bar */}
                  {(strategy.status === 'testing' || strategy.status === 'paused') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Test Progress</span>
                        <span>{strategy.progress}%</span>
                      </div>
                      <Progress value={strategy.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Started: {strategy.startDate.toLocaleDateString()}</span>
                        <span>Est. Complete: {strategy.estimatedCompletion.toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Return</span>
                        <span className={`font-semibold ${
                          strategy.currentReturn >= 0 ? 'text-accent' : 'text-destructive'
                        }`}>
                          {strategy.currentReturn >= 0 ? '+' : ''}{strategy.currentReturn.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max Drawdown</span>
                        <span className="font-semibold text-destructive">
                          {strategy.maxDrawdown.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trades</span>
                        <span className="font-semibold">{strategy.trades}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Win Rate</span>
                        <span className="font-semibold">{strategy.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                        <span className="font-semibold">{strategy.sharpeRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Risk Level</span>
                        <Badge variant="outline" className={`text-xs ${getRiskColor(strategy.riskLevel)}`}>
                          {strategy.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Allocation */}
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Test Allocation</span>
                    <span className="font-semibold">${strategy.allocation.toLocaleString()}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {strategy.status === 'testing' && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Pause className="w-4 h-4 mr-2" />
                          Pause Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    {strategy.status === 'paused' && (
                      <>
                        <Button size="sm" className="flex-1 bg-gradient-primary hover:opacity-90">
                          <Play className="w-4 h-4 mr-2" />
                          Resume Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {strategy.status === 'completed' && (
                      <>
                        <Button size="sm" className="flex-1 bg-gradient-success hover:opacity-90">
                          <Target className="w-4 h-4 mr-2" />
                          Deploy Strategy
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {strategy.status === 'failed' && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="w-4 h-4 mr-2" />
                          Modify & Retest
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filterStrategies(activeTab).length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Baby className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  No {activeTab} strategies
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'incubating' && 'Start incubating your first strategy to begin testing new ideas'}
                  {activeTab === 'completed' && 'No strategies have completed testing yet'}
                  {activeTab === 'failed' && 'No failed strategies to review'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}