// TradeBot Manager - Comprehensive bot deployment, management, and monitoring interface

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  Copy, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Brain,
  Target,
  Activity,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Zap,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tradeBotEngine } from '@/services/tradeBotEngine';
import { botTemplateService } from '@/services/botTemplates';
import type { 
  TradeBotEngine, 
  BotRunMode, 
  BotExecutionStatus,
  BotDeploymentRequest,
  BotDuplicationRequest,
  BotEngineConfig 
} from '@/types/tradeBotEngine';

interface TradeBotManagerProps {
  userTier: 'lite' | 'standard' | 'pro' | 'elite';
  isDemo?: boolean;
}

export function TradeBotManager({ userTier, isDemo = false }: TradeBotManagerProps) {
  const [bots, setBots] = useState<TradeBotEngine[]>([]);
  const [selectedBot, setSelectedBot] = useState<TradeBotEngine | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBots();
    loadSystemMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadBots();
      loadSystemMetrics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadBots = async () => {
    try {
      const botList = tradeBotEngine.getBots();
      setBots(botList);
      
      // Select first bot if none selected
      if (!selectedBot && botList.length > 0) {
        setSelectedBot(botList[0]);
      }
    } catch (error) {
      toast({
        title: "Error Loading Bots",
        description: error instanceof Error ? error.message : "Failed to load bots",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemMetrics = () => {
    const metrics = tradeBotEngine.getSystemMetrics();
    setSystemMetrics(metrics);
  };

  const handleStartBot = async (botId: string) => {
    try {
      await tradeBotEngine.startBot(botId);
      await loadBots();
      
      toast({
        title: "Bot Started",
        description: "Bot is now analyzing markets and generating signals"
      });
    } catch (error) {
      toast({
        title: "Failed to Start Bot",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      await tradeBotEngine.stopBot(botId);
      await loadBots();
      
      toast({
        title: "Bot Stopped",
        description: "Bot has been deactivated"
      });
    } catch (error) {
      toast({
        title: "Failed to Stop Bot",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleHaltBot = async (botId: string) => {
    try {
      await tradeBotEngine.haltBot(botId, "Manual halt by user");
      await loadBots();
      
      toast({
        title: "Bot Halted",
        description: "Bot has been emergency halted and positions closed",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Failed to Halt Bot",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateBot = async (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;

    try {
      const duplicateRequest: BotDuplicationRequest = {
        source_bot_id: botId,
        new_name: `${bot.name} Copy`,
        mode: 'paper'
      };

      await tradeBotEngine.duplicateBot(duplicateRequest);
      await loadBots();
      
      toast({
        title: "Bot Duplicated",
        description: `Created copy: ${duplicateRequest.new_name}`
      });
    } catch (error) {
      toast({
        title: "Failed to Duplicate Bot",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleModeChange = async (botId: string, newMode: BotRunMode) => {
    try {
      await tradeBotEngine.updateBotStatus({
        bot_id: botId,
        mode: newMode
      });
      await loadBots();
      
      toast({
        title: "Mode Changed",
        description: `Bot switched to ${newMode} mode`
      });
    } catch (error) {
      toast({
        title: "Failed to Change Mode",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const getModeColor = (mode: BotRunMode) => {
    switch (mode) {
      case 'live': return 'bg-green-500';
      case 'paper': return 'bg-blue-500';
      case 'research': return 'bg-purple-500';
      case 'halted': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: BotExecutionStatus) => {
    switch (status) {
      case 'trading': return 'text-green-600';
      case 'analyzing': return 'text-blue-600';
      case 'learning': return 'text-purple-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (userTier === 'lite' || userTier === 'standard') {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">TradeBot Engine</h3>
            <p className="text-muted-foreground">
              Autonomous trading bots with machine learning are available for Pro and Elite subscribers.
            </p>
          </div>
          <Button variant="outline">
            Upgrade to Pro
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Bots</p>
                <p className="text-2xl font-bold">{systemMetrics?.total_bots || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {systemMetrics?.active_bots || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Allocation</p>
                <p className="text-lg font-bold">
                  {formatCurrency(systemMetrics?.total_allocation || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Avg Performance</p>
                <p className={`text-lg font-bold ${systemMetrics?.avg_performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(systemMetrics?.avg_performance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Trading Bots
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowDeployModal(true)}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Deploy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={loadBots}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No bots deployed yet</p>
                  <p className="text-xs">Deploy your first trading bot to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {bots.map((bot) => (
                      <div
                        key={bot.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBot?.id === bot.id 
                            ? 'bg-primary/5 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedBot(bot)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{bot.name}</h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getModeColor(bot.mode)}/20`}
                              >
                                {bot.mode}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs ${getStatusColor(bot.status)}`}>
                                {bot.status}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {bot.config.strategy}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Trades:</span>{' '}
                                <span className="font-medium">{bot.metrics.total_trades}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Win Rate:</span>{' '}
                                <span className="font-medium">{(bot.metrics.win_rate * 100).toFixed(0)}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Return:</span>{' '}
                                <span className={`font-medium ${bot.metrics.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercentage(bot.metrics.total_return_pct)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Allocation:</span>{' '}
                                <span className="font-medium">{formatCurrency(bot.config.allocation)}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bot Details */}
        <div className="lg:col-span-2">
          {selectedBot ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Bot className="w-5 h-5" />
                          {selectedBot.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedBot.description || 'No description provided'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateBot(selectedBot.id)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                        
                        {selectedBot.status === 'idle' ? (
                          <Button
                            size="sm"
                            onClick={() => handleStartBot(selectedBot.id)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopBot(selectedBot.id)}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Stop
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleHaltBot(selectedBot.id)}
                            >
                              <Square className="w-4 h-4 mr-2" />
                              Halt
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className={`text-sm font-medium ${getStatusColor(selectedBot.status)}`}>
                          {selectedBot.status.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">Status</div>
                      </div>
                      
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium">
                          <Badge className={getModeColor(selectedBot.mode)}>
                            {selectedBot.mode.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">Mode</div>
                      </div>
                      
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium">
                          {selectedBot.config.strategy.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">Strategy</div>
                      </div>
                      
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium">
                          {Math.floor((Date.now() - selectedBot.last_heartbeat.getTime()) / 1000)}s
                        </div>
                        <div className="text-xs text-muted-foreground">Last Heartbeat</div>
                      </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="space-y-3">
                      <Label>Operating Mode</Label>
                      <div className="flex gap-2">
                        {(['research', 'paper', 'live'] as BotRunMode[]).map((mode) => (
                          <Button
                            key={mode}
                            size="sm"
                            variant={selectedBot.mode === mode ? "default" : "outline"}
                            onClick={() => handleModeChange(selectedBot.id, mode)}
                            disabled={mode === 'live' && isDemo}
                            className="flex-1"
                          >
                            {mode === 'research' && <Brain className="w-4 h-4 mr-2" />}
                            {mode === 'paper' && <Target className="w-4 h-4 mr-2" />}
                            {mode === 'live' && <Zap className="w-4 h-4 mr-2" />}
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Research:</strong> Backtest and learn without trading • {' '}
                        <strong>Paper:</strong> Simulate trades with fake money • {' '}
                        <strong>Live:</strong> Execute real trades with real money
                      </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {selectedBot.metrics.total_trades}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                      </div>
                      
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {(selectedBot.metrics.win_rate * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                      </div>
                      
                      <div>
                        <div className={`text-2xl font-bold ${
                          selectedBot.metrics.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(selectedBot.metrics.total_return_pct)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Return</div>
                      </div>
                      
                      <div>
                        <div className="text-2xl font-bold">
                          {selectedBot.metrics.sharpe_ratio.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Trading Statistics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Winning Trades</span>
                            <span className="font-medium">{selectedBot.metrics.winning_trades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Losing Trades</span>
                            <span className="font-medium">{selectedBot.metrics.losing_trades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg Hold Time</span>
                            <span className="font-medium">{selectedBot.metrics.avg_hold_time.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg Trade Size</span>
                            <span className="font-medium">{formatCurrency(selectedBot.metrics.avg_trade_size)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Risk Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Max Drawdown</span>
                            <span className="font-medium text-red-600">
                              {formatPercentage(selectedBot.metrics.max_drawdown_pct)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Value at Risk</span>
                            <span className="font-medium">{formatCurrency(selectedBot.metrics.value_at_risk)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Beta</span>
                            <span className="font-medium">{selectedBot.metrics.beta.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Alpha</span>
                            <span className="font-medium">{selectedBot.metrics.alpha.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Recent Performance (30 Days)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold">{selectedBot.metrics.recent_trades}</div>
                          <div className="text-sm text-muted-foreground">Trades</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className={`text-2xl font-bold ${
                            selectedBot.metrics.recent_return_pct >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(selectedBot.metrics.recent_return_pct)}
                          </div>
                          <div className="text-sm text-muted-foreground">Return</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {(selectedBot.metrics.recent_win_rate * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="config">
                <BotConfigPanel bot={selectedBot} onUpdate={loadBots} />
              </TabsContent>

              {/* Decisions Tab */}
              <TabsContent value="decisions">
                <BotDecisionsPanel bot={selectedBot} />
              </TabsContent>

              {/* Learning Tab */}
              <TabsContent value="learning">
                <BotLearningPanel bot={selectedBot} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Bot Selected</h3>
                <p>Select a bot from the list to view its details and controls.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <BotDeployModal 
          onClose={() => setShowDeployModal(false)}
          onDeploy={async (request) => {
            await tradeBotEngine.deployBot(request);
            await loadBots();
            setShowDeployModal(false);
          }}
          userTier={userTier}
        />
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && selectedBot && (
        <BotDuplicateModal 
          sourceBot={selectedBot}
          onClose={() => setShowDuplicateModal(false)}
          onDuplicate={async (request) => {
            await tradeBotEngine.duplicateBot(request);
            await loadBots();
            setShowDuplicateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Additional Components (simplified for now - would be fully implemented)
function BotConfigPanel({ bot, onUpdate }: { bot: TradeBotEngine; onUpdate: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Bot configuration panel - would contain detailed configuration options
        </p>
      </CardContent>
    </Card>
  );
}

function BotDecisionsPanel({ bot }: { bot: TradeBotEngine }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Recent Decisions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Decision history and explanations - would show bot reasoning and outcomes
        </p>
      </CardContent>
    </Card>
  );
}

function BotLearningPanel({ bot }: { bot: TradeBotEngine }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Machine Learning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Learning metrics and model performance - would show training results and adaptations
        </p>
      </CardContent>
    </Card>
  );
}

function BotDeployModal({ onClose, onDeploy, userTier }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Deploy New Bot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bot deployment modal - would contain template selection and configuration
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
            <Button onClick={() => onClose()} className="flex-1">Deploy</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BotDuplicateModal({ sourceBot, onClose, onDuplicate }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Duplicate Bot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bot duplication modal - would contain name and configuration options
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
            <Button onClick={() => onClose()} className="flex-1">Duplicate</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}