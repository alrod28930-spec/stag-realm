import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, PlayCircle, PauseCircle, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { BotActivationModal } from './BotActivationModal';
import { useToast } from '@/hooks/use-toast';
import { tradeBotSystem } from '@/services/tradeBots';
import type { TradeBot, BotStrategy } from '@/types/tradeBots';

interface BotDeploymentPanelProps {
  isSystemActive: boolean;
  isDemo?: boolean;
}

const STRATEGY_OPTIONS: { value: BotStrategy; label: string; riskLevel: 'low' | 'medium' | 'high' }[] = [
  { value: 'momentum', label: 'Momentum Trading', riskLevel: 'medium' },
  { value: 'mean_reversion', label: 'Mean Reversion', riskLevel: 'low' },
  { value: 'breakout', label: 'Breakout Strategy', riskLevel: 'high' },
  { value: 'scalping', label: 'Scalping', riskLevel: 'high' },
  { value: 'volatility', label: 'Volatility Trading', riskLevel: 'medium' },
  { value: 'signal_stacking', label: 'Signal Stacking', riskLevel: 'medium' }
];

export function BotDeploymentPanel({ isSystemActive, isDemo = false }: BotDeploymentPanelProps) {
  const [bots, setBots] = useState<TradeBot[]>([]);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [newBotStrategy, setNewBotStrategy] = useState<BotStrategy>('momentum');
  const [newBotAllocation, setNewBotAllocation] = useState('1000');
  const { toast } = useToast();

  useEffect(() => {
    refreshBots();
  }, []);

  const refreshBots = () => {
    setBots(tradeBotSystem.getBots());
  };

  const handleCreateBot = () => {
    const allocation = parseFloat(newBotAllocation);
    if (allocation < 100) {
      toast({
        title: "Invalid Allocation",
        description: "Minimum allocation is $100",
        variant: "destructive"
      });
      return;
    }

    const botId = tradeBotSystem.createBot({
      name: `${STRATEGY_OPTIONS.find(s => s.value === newBotStrategy)?.label} Bot`,
      strategy: newBotStrategy,
      allocation,
      riskTolerance: 0.5
    });

    if (botId) {
      toast({
        title: "Bot Created",
        description: `New ${newBotStrategy} bot created with $${allocation} allocation`
      });
      refreshBots();
      setNewBotAllocation('1000');
    }
  };

  const handleBotToggle = (botId: string, activate: boolean) => {
    if (activate && !isDemo) {
      setSelectedBotId(botId);
      setShowActivationModal(true);
      return;
    }

    // Update bot status directly
    const bot = tradeBotSystem.getBot(botId);
    if (bot) {
      bot.isActive = activate;
      bot.lastActive = new Date();
      
      toast({
        title: activate ? "Bot Activated" : "Bot Deactivated",
        description: `Bot ${activate ? 'started' : 'stopped'} ${isDemo ? 'in demo mode' : 'for live trading'}`
      });
      refreshBots();
    }
  };

  const handleActivationConfirm = () => {
    if (selectedBotId) {
      const bot = tradeBotSystem.getBot(selectedBotId);
      if (bot) {
        bot.isActive = true;
        bot.lastActive = new Date();
        
        toast({
          title: "Bot Activated",
          description: "Bot is now live and monitoring markets"
        });
        refreshBots();
      }
    }
    setShowActivationModal(false);
    setSelectedBotId(null);
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'high': return 'text-red-600';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Quick Deploy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="w-5 h-5" />
              Deploy Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={newBotStrategy} onValueChange={(value: BotStrategy) => setNewBotStrategy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map(strategy => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{strategy.label}</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 text-xs ${getRiskColor(strategy.riskLevel)}`}
                        >
                          {strategy.riskLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation">Allocation ($)</Label>
              <Input
                id="allocation"
                type="number"
                min="100"
                step="100"
                value={newBotAllocation}
                onChange={(e) => setNewBotAllocation(e.target.value)}
                placeholder="1000"
              />
            </div>

            <Button 
              onClick={handleCreateBot} 
              className="w-full"
              disabled={!isSystemActive && !isDemo}
            >
              Create & Deploy Bot
            </Button>

            {!isSystemActive && !isDemo && (
              <p className="text-xs text-muted-foreground text-center">
                Activate live trading system to deploy bots
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Bots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Active Bots ({bots.filter(b => b.isActive).length})
              </div>
              <Badge variant="secondary">${bots.reduce((sum, b) => sum + b.allocation, 0).toLocaleString()}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bots.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No bots deployed yet</p>
                <p className="text-xs">Create your first trading bot above</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {bots.map((bot) => (
                    <div key={bot.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{bot.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {bot.strategy} • ${bot.allocation.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={bot.isActive ? "destructive" : "default"}
                          onClick={() => handleBotToggle(bot.id, !bot.isActive)}
                          disabled={!isSystemActive && !bot.isActive && !isDemo}
                        >
                          {bot.isActive ? (
                            <PauseCircle className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {bot.isActive && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-green-600">
                              {bot.winRate.toFixed(0)}%
                            </div>
                            <div className="text-muted-foreground">Win Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">
                              {bot.totalTrades}
                            </div>
                            <div className="text-muted-foreground">Trades</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-semibold ${bot.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {bot.totalReturn >= 0 ? '+' : ''}{bot.totalReturn.toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground">Return</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        {bots.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                Portfolio Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Allocation</div>
                  <div className="font-semibold">${bots.reduce((sum, b) => sum + b.allocation, 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Performance</div>
                  <div className="font-semibold text-green-600">
                    +{(bots.reduce((sum, b) => sum + b.totalReturn, 0) / bots.length).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Warning */}
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">Automated Trading Risks:</p>
              <ul className="space-y-0.5 text-xs">
                <li>• Bots execute trades based on algorithms and market data</li>
                <li>• All trades are subject to Monarch & Overseer risk controls</li>
                <li>• Performance targets are goals, not guarantees</li>
                <li>• You remain fully responsible for all trading outcomes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <BotActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onConfirm={handleActivationConfirm}
        botName={bots.find(b => b.id === selectedBotId)?.name || ''}
      />
    </>
  );
}