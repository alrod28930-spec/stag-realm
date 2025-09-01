import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Plus,
  MoreHorizontal,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface TradingBot {
  id: string;
  name: string;
  strategy: string;
  status: 'running' | 'stopped' | 'error';
  performance: {
    totalReturn: number;
    winRate: number;
    tradesExecuted: number;
    avgHoldTime: string;
    sharpeRatio: number;
  };
  allocation: number;
  createdAt: Date;
  lastActivity: Date;
}

export default function TradeBots() {
  const [bots] = useState<TradingBot[]>([
    {
      id: '1',
      name: 'Momentum Scalper',
      strategy: 'Mean Reversion + RSI',
      status: 'running',
      performance: {
        totalReturn: 12.5,
        winRate: 68.2,
        tradesExecuted: 247,
        avgHoldTime: '15m',
        sharpeRatio: 1.45
      },
      allocation: 25000,
      createdAt: new Date('2024-01-15'),
      lastActivity: new Date()
    },
    {
      id: '2',
      name: 'Trend Follower Pro',
      strategy: 'EMA Crossover',
      status: 'running',
      performance: {
        totalReturn: 8.7,
        winRate: 72.1,
        tradesExecuted: 89,
        avgHoldTime: '2h 30m',
        sharpeRatio: 1.28
      },
      allocation: 50000,
      createdAt: new Date('2024-02-01'),
      lastActivity: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: '3',
      name: 'Breakout Hunter',
      strategy: 'Volume Breakout',
      status: 'stopped',
      performance: {
        totalReturn: -2.1,
        winRate: 45.8,
        tradesExecuted: 156,
        avgHoldTime: '45m',
        sharpeRatio: 0.32
      },
      allocation: 15000,
      createdAt: new Date('2024-01-20'),
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '4',
      name: 'Grid Trading Bot',
      strategy: 'Grid Strategy',
      status: 'error',
      performance: {
        totalReturn: 5.2,
        winRate: 58.9,
        tradesExecuted: 324,
        avgHoldTime: '1h 15m',
        sharpeRatio: 0.89
      },
      allocation: 30000,
      createdAt: new Date('2024-01-10'),
      lastActivity: new Date(Date.now() - 30 * 60 * 1000)
    }
  ]);

  const totalAllocation = bots.reduce((sum, bot) => sum + bot.allocation, 0);
  const runningBots = bots.filter(bot => bot.status === 'running').length;
  const avgReturn = bots.reduce((sum, bot) => sum + bot.performance.totalReturn, 0) / bots.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-accent text-accent-foreground';
      case 'stopped': return 'bg-muted text-muted-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-3 h-3" />;
      case 'stopped': return <Pause className="w-3 h-3" />;
      case 'error': return <AlertCircle className="w-3 h-3" />;
      default: return <Pause className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade Bots</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your automated trading strategies
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Create Bot
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bots
            </CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bots.length}</div>
            <p className="text-xs text-muted-foreground">
              {runningBots} running
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Allocation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAllocation.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all bots
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Return
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgReturn >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Trades
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bots.reduce((sum, bot) => sum + (bot.status === 'running' ? 1 : 0), 0) * 3}
            </div>
            <p className="text-xs text-muted-foreground">
              Open positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bots.map((bot) => (
          <Card key={bot.id} className="bg-gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{bot.name}</CardTitle>
                    <CardDescription>{bot.strategy}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(bot.status)}>
                    {getStatusIcon(bot.status)}
                    <span className="ml-1 capitalize">{bot.status}</span>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete Bot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Return</span>
                    <span className={`font-semibold ${
                      bot.performance.totalReturn >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {bot.performance.totalReturn >= 0 ? '+' : ''}{bot.performance.totalReturn}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{bot.performance.winRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-medium">{bot.performance.tradesExecuted}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Allocation</span>
                    <span className="font-semibold">${bot.allocation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Hold</span>
                    <span className="font-medium">{bot.performance.avgHoldTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sharpe</span>
                    <span className="font-medium">{bot.performance.sharpeRatio}</span>
                  </div>
                </div>
              </div>

              {/* Win Rate Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate Progress</span>
                  <span className="text-xs text-muted-foreground">{bot.performance.winRate}%</span>
                </div>
                <Progress value={bot.performance.winRate} className="h-2" />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {bot.status === 'running' ? (
                  <Button variant="outline" size="sm" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Bot
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1 bg-gradient-primary hover:opacity-90">
                    <Play className="w-4 h-4 mr-2" />
                    Start Bot
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>

              {/* Last Activity */}
              <div className="text-xs text-muted-foreground">
                Last activity: {bot.lastActivity.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}