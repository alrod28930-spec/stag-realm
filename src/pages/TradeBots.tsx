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
import { useCompliance } from '@/components/compliance/ComplianceProvider';
import { DisclaimerBadge } from '@/components/compliance/DisclaimerBadge';
import { LegalFooter } from '@/components/compliance/LegalFooter';
import { useToast } from '@/hooks/use-toast';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { toggleService } from '@/services/toggleService';
import { RiskGoalsCard } from '@/components/tradebots/RiskGoalsCard';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function TradeBots() {
  const [bots, setBots] = useState<TradeBot[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [toggleState, setToggleState] = useState(toggleService.getToggleState());
  const { showDisclaimer } = useCompliance();
  const { toast } = useToast();
  
  // Get current user and workspace
  const user = useAuthStore((state) => state.user);
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  useEffect(() => {
    // Load initial data
    loadBots();
    loadMetrics();

    // Subscribe to toggle changes
    const unsubscribe = toggleService.subscribe(setToggleState);

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadBots();
      loadMetrics();
    }, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const loadBots = () => {
    const allBots = tradeBotSystem.getBots();
    setBots(allBots);
  };

  const loadMetrics = () => {
    const currentMetrics = tradeBotSystem.getMetrics();
    setMetrics(currentMetrics);
  };

  const handleStatusToggle = async (botId: string, newStatus: 'off' | 'simulation' | 'live') => {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;

    const currentStatus = toggleService.getBotStatus(botId);

    // Show disclaimer when switching to live trading
    if (newStatus === 'live' && currentStatus !== 'live') {
      await showDisclaimer('trade_bots', 'execute', { 
        botId, 
        botName: bot.name, 
        currentStatus, 
        newStatus 
      });
    }

    // Update via toggle service
    toggleService.setBotStatus(botId, newStatus, `User toggled bot ${bot.name}`);

    // Update bot status locally
    const updatedBot = { ...bot, status: newStatus, isActive: newStatus !== 'off' };
    setBots(bots.map(b => b.id === botId ? updatedBot : b));
    
    // Show confirmation toast
    toast({
      title: `Bot ${newStatus === 'live' ? 'Activated' : newStatus === 'simulation' ? 'Started in Simulation' : 'Stopped'}`,
      description: `${bot.name} is now ${getStatusText(newStatus).toLowerCase()}`,
      variant: newStatus === 'live' ? 'default' : 'default',
    });
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Trade Bots
            <DisclaimerBadge variant="minimal" component="trade_bots" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Automated trading strategies with governance oversight
          </p>
        </div>
        <Button onClick={handleCreateBot} className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Create Bot
        </Button>
      </div>

      {/* Risk & Goals Panel */}
      {user && currentWorkspace && (
        <div className="max-w-2xl">
          <RiskGoalsCard 
            workspaceId={currentWorkspace.id} 
            userId={user.id} 
          />
        </div>
      )}

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
                <div className="flex items-center space-x-3">
                  <ToggleSwitch
                    value={toggleService.getBotStatus(bot.id)}
                    onChange={(status) => handleStatusToggle(bot.id, status)}
                    size="sm"
                    showLabels={false}
                  />
                  <Badge className={getStatusColor(toggleService.getBotStatus(bot.id))}>
                    {getStatusIcon(toggleService.getBotStatus(bot.id))}
                    <span className="ml-1">{getStatusText(toggleService.getBotStatus(bot.id))}</span>
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
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
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

      {/* Legal Footer */}
      <LegalFooter component="trade_bots" variant="detailed" />

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