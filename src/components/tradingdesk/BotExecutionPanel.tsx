import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Bot, Pause, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BotActivationModal } from './BotActivationModal';
import { SimpleDayTradingModal } from './SimpleDayTradingModal';
import { LockGuard } from '@/components/subscription/LockGuard';

interface BotProfile {
  workspace_id: string;
  name: string | null;
  active: boolean;
  mode: string; // Will be 'standard' | 'intraday' but comes as string from DB
  execution_mode: string;
  risk_indicator: string;
  daily_return_target_pct: number;
  intraday_enabled: boolean;
  intraday_max_trades: number;
  last_activated?: string;
  last_deactivated?: string;
}

export function BotExecutionPanel() {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showDayTradingModal, setShowDayTradingModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotProfile | null>(null);
  const [pendingMode, setPendingMode] = useState<'standard' | 'intraday' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_profiles')
        .select('*')
        .order('name');

      if (error) throw error;

      setBots(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load bots",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBotToggle = async (bot: BotProfile, active: boolean) => {
    if (active) {
      // Show activation modal for first-time bot activation
      setSelectedBot(bot);
      setShowActivationModal(true);
      return;
    }

    // Deactivate bot immediately
    await updateBotStatus(bot, false, bot.mode as 'standard' | 'intraday');
  };

  const handleModeChange = async (bot: BotProfile, newMode: 'standard' | 'intraday') => {
    if (newMode === 'intraday') {
      // Show day trading disclaimer
      setSelectedBot(bot);
      setPendingMode(newMode);
      setShowDayTradingModal(true);
      return;
    }

    // Switch to standard mode immediately
    await updateBotStatus(bot, bot.active, newMode);
  };

  const updateBotStatus = async (bot: BotProfile, active: boolean, mode: 'standard' | 'intraday') => {
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        active,
        mode,
        ...(active ? { last_activated: now } : { last_deactivated: now })
      };

      // Update intraday_enabled based on mode
      if (mode === 'intraday') {
        updateData.intraday_enabled = true;
      } else {
        updateData.intraday_enabled = false;
      }

      const { error } = await supabase
        .from('bot_profiles')
        .update(updateData)
        .eq('workspace_id', bot.workspace_id);

      if (error) throw error;

      // Log the bot toggle event
      await supabase.from('rec_events').insert({
        workspace_id: bot.workspace_id,
        event_type: 'bot.toggled',
        severity: 1,
        entity_type: 'bot',
        entity_id: bot.workspace_id,
        summary: `Bot ${bot.name} ${active ? 'activated' : 'deactivated'} in ${mode} mode`,
        payload_json: {
          bot_id: bot.workspace_id,
          name: bot.name,
          active,
          mode,
          execution_mode: bot.execution_mode,
          risk_level: bot.risk_indicator
        }
      });

      await loadBots();

      toast({
        title: `Bot ${active ? 'Activated' : 'Deactivated'}`,
        description: `${bot.name} is now ${active ? 'active' : 'inactive'} in ${mode} mode`,
      });

    } catch (error: any) {
      toast({
        title: "Failed to update bot",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const pauseAllBots = async () => {
    try {
      const { error } = await supabase
        .from('bot_profiles')
        .update({ 
          active: false, 
          last_deactivated: new Date().toISOString() 
        })
        .eq('active', true);

      if (error) throw error;

      // Log the pause all event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('rec_events').insert({
          workspace_id: user.user_metadata?.workspace_id || user.id,
          user_id: user.id,
          event_type: 'settings.bots.pause_all',
          severity: 1,
          entity_type: 'system',
          entity_id: 'bots',
          summary: 'All bots paused by user',
          payload_json: {
            action: 'pause_all',
            bot_count: bots.filter(b => b.active).length
          }
        });
      }

      await loadBots();

      toast({
        title: "All Bots Paused",
        description: "All active bots have been deactivated",
      });

    } catch (error: any) {
      toast({
        title: "Failed to pause bots",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleActivationConfirm = async () => {
    if (!selectedBot) return;
    
    await updateBotStatus(selectedBot, true, selectedBot.mode as 'standard' | 'intraday');
    setShowActivationModal(false);
    setSelectedBot(null);
  };

  const handleDayTradingConfirm = async () => {
    if (!selectedBot || !pendingMode) return;

    // Log compliance acknowledgment
    await supabase.from('compliance_acknowledgments').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      workspace_id: selectedBot.workspace_id,
      document_type: 'day_trading_disclaimer',
      version: 'v1-2025-09-03',
      acknowledged_at: new Date().toISOString()
    });

    await updateBotStatus(selectedBot, selectedBot.active, pendingMode);
    setShowDayTradingModal(false);
    setSelectedBot(null);
    setPendingMode(null);
  };

  const getRiskBadgeVariant = (riskLevel: string, mode: string) => {
    if (mode === 'intraday') return 'destructive'; // Always high risk for day trading
    
    switch (riskLevel) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskLabel = (riskLevel: string, mode: string) => {
    if (mode === 'intraday') return 'High Risk';
    
    switch (riskLevel) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk'; 
      case 'high': return 'High Risk';
      default: return 'Unknown Risk';
    }
  };

  // Helper to determine if bot requires advanced features
  const isAdvancedBot = (bot: BotProfile): boolean => {
    return bot.name?.toLowerCase().includes('advanced') || 
           bot.name?.toLowerCase().includes('custom') ||
           bot.risk_indicator === 'high';
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Execution Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Execution Panel
          </CardTitle>
          <Button 
            onClick={pauseAllBots}
            variant="outline" 
            size="sm"
            disabled={!bots.some(b => b.active)}
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause All
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {bots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bots configured</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first bot in the Trade Bots tab
              </p>
            </div>
          ) : (
            bots.map((bot) => (
              <div 
                key={bot.workspace_id}
                className="p-4 rounded-lg border bg-muted/20 space-y-3"
              >
                {/* Bot Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      bot.active ? 'bg-accent animate-pulse' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <h4 className="font-semibold">{bot.name || 'Unnamed Bot'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Target: {(bot.daily_return_target_pct * 100).toFixed(1)}% daily
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskBadgeVariant(bot.risk_indicator, bot.mode)}>
                      {getRiskLabel(bot.risk_indicator, bot.mode)}
                    </Badge>
                    
                    {/* Bot Activation Switch with Feature Guard */}
                    <LockGuard 
                      feature={isAdvancedBot(bot) ? 'ADV_BOTS' : 'CORE_BOTS'}
                      workspaceId={bot.workspace_id}
                      fallback={
                        <div className="flex items-center gap-2">
                          <Switch disabled checked={false} />
                          <span className="text-xs text-muted-foreground">
                            {isAdvancedBot(bot) ? 'Pro Required' : 'Standard Required'}
                          </span>
                        </div>
                      }
                    >
                      <Switch
                        checked={bot.active}
                        onCheckedChange={(active) => handleBotToggle(bot, active)}
                      />
                    </LockGuard>
                  </div>
                </div>

                {/* Bot Controls */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Mode:</label>
                    
                    {/* Day Trading Mode with Feature Guard */}
                    <LockGuard 
                      feature="DAY_TRADE_MODE"
                      workspaceId={bot.workspace_id}
                      fallback={
                        <Select disabled value="standard">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="intraday" disabled>Day Trading (Pro)</SelectItem>
                          </SelectContent>
                        </Select>
                      }
                    >
                      <Select
                        value={bot.mode}
                        onValueChange={(value: string) => 
                          handleModeChange(bot, value as 'standard' | 'intraday')
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="intraday">Day Trading</SelectItem>
                        </SelectContent>
                      </Select>
                    </LockGuard>
                  </div>

                  {bot.mode === 'intraday' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Square className="w-3 h-3" />
                      Max: {bot.intraday_max_trades} trades/day
                    </div>
                  )}
                </div>

                {/* Status Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div>
                    Status: {bot.active ? 
                      <span className="text-accent">Active</span> : 
                      <span>Inactive</span>
                    }
                  </div>
                  <div>
                    Execution: {bot.execution_mode}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Compliance Notice */}
          <div className="p-3 bg-muted/30 rounded-md mt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Automated trading carries risk of loss. All orders are mirrored via your brokerage; 
                StagAlgo never holds funds. Performance targets are goals, not guarantees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <BotActivationModal
        isOpen={showActivationModal}
        onClose={() => {
          setShowActivationModal(false);
          setSelectedBot(null);
        }}
        onConfirm={handleActivationConfirm}
        botName={selectedBot?.name || ''}
      />

      <SimpleDayTradingModal
        open={showDayTradingModal}
        onClose={() => {
          setShowDayTradingModal(false);
          setSelectedBot(null);
          setPendingMode(null);
        }}
        onAccept={handleDayTradingConfirm}
      />
    </>
  );
}