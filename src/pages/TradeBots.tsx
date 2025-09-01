import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  AlertCircle,
  Plus,
  Activity,
  DollarSign,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { tradeBotSystem } from '@/services/tradeBots';
import { TradeBot, BotMetrics } from '@/types/tradeBots';

export default function TradeBots() {
  const [bots, setBots] = useState<TradeBot[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);

  useEffect(() => {
    // Load initial data
    loadBots();
    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadBots();
      loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadBots = () => {
    const allBots = tradeBotSystem.getBots();
    setBots(allBots);
  };

  const loadMetrics = () => {
    const currentMetrics = tradeBotSystem.getMetrics();
    setMetrics(currentMetrics);
  };

  const handleStatusToggle = (botId: string, currentStatus: string) => {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;

    let newStatus: 'off' | 'simulation' | 'live';
    
    if (currentStatus === 'off') {
      newStatus = 'simulation';
    } else if (currentStatus === 'simulation') {
      newStatus = 'live';
    } else {
      newStatus = 'off';
    }

    // Update bot status locally and notify system
    const updatedBot = { ...bot, status: newStatus, isActive: newStatus !== 'off' };
    setBots(bots.map(b => b.id === botId ? updatedBot : b));
    
    console.log(`Bot ${bot.name} status changed to ${newStatus}`);
  };

  const handleCreateBot = () => {
    const newBot = tradeBotSystem.createBot({
      name: `Bot ${bots.length + 1}`,
      strategy: 'momentum',
      allocation: 1000
    });
    
    setBots([...bots, newBot]);
  };

  const handleDeleteBot = (botId: string) => {
    if (tradeBotSystem.deleteBot(botId)) {
      setBots(bots.filter(b => b.id !== botId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-accent text-accent-foreground';
      case 'simulation': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'off': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Play className="w-3 h-3" />;
      case 'simulation': return <Activity className="w-3 h-3" />;
      case 'off': return <Pause className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Live Trading';
      case 'simulation': return 'Simulation';
      case 'off': return 'Stopped';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade Bots</h1>
          <p className="text-muted-foreground mt-2">
            Automated trading strategies with governance oversight
          </p>
        </div>
        <Button onClick={handleCreateBot} className="bg-gradient-primary hover:opacity-90">
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
            <div className="text-2xl font-bold">{metrics?.totalBots || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeBots || 0} active
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
            <div className="text-2xl font-bold">
              ${(metrics?.totalAllocation || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all strategies
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Performance
            </CardTitle>
            {(metrics?.averagePerformance || 0) >= 0 ? 
              <TrendingUp className="h-4 w-4 text-primary" /> : 
              <TrendingDown className="h-4 w-4 text-destructive" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (metrics?.averagePerformance || 0) >= 0 ? 'text-accent' : 'text-destructive'
            }`}>
              {(metrics?.averagePerformance || 0) >= 0 ? '+' : ''}
              {(metrics?.averagePerformance || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall return
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Trades
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalTradesDaily || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active today
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
                    <CardDescription className="capitalize">{bot.strategy} Strategy</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(bot.status)}>
                    {getStatusIcon(bot.status)}
                    <span className="ml-1">{getStatusText(bot.status)}</span>
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
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteBot(bot.id)}
                      >
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
                      bot.totalReturn >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {bot.totalReturn >= 0 ? '+' : ''}{bot.totalReturn.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{bot.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-medium">{bot.totalTrades}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Allocation</span>
                    <span className="font-semibold">${bot.allocation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Hold</span>
                    <span className="font-medium">{bot.averageHoldTime}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sharpe</span>
                    <span className="font-medium">{bot.sharpeRatio.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Win Rate Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate Progress</span>
                  <span className="text-xs text-muted-foreground">{bot.winRate.toFixed(1)}%</span>
                </div>
                <Progress value={bot.winRate} className="h-2" />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button 
                  variant={bot.status === 'off' ? 'default' : 'outline'}
                  size="sm" 
                  className={`flex-1 ${bot.status === 'off' ? 'bg-gradient-primary hover:opacity-90' : ''}`}
                  onClick={() => handleStatusToggle(bot.id, bot.status)}
                >
                  {bot.status === 'off' ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Bot
                    </>
                  ) : bot.status === 'simulation' ? (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Go Live
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Bot
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>

              {/* Last Activity */}
              <div className="text-xs text-muted-foreground">
                Last activity: {bot.lastActive.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {bots.length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trade Bots Created</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first automated trading bot to get started with algorithmic trading.
            </p>
            <Button onClick={handleCreateBot} className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Bot
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}