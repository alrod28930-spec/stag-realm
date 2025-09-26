import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, User, AlertTriangle, Shield, Activity } from 'lucide-react';
import { ManualOrderCard } from './ManualOrderCard';
import { BotDeploymentPanel } from './BotDeploymentPanel';
import { LiveTradingMonitor } from './LiveTradingMonitor';
import { useToast } from '@/hooks/use-toast';
import { tradeBotSystem } from '@/services/tradeBots';
import { riskEnforcement } from '@/services/riskEnforcement';

interface LiveTradingPanelProps {
  isDemo?: boolean;
}

export function LiveTradingPanel({ isDemo = false }: LiveTradingPanelProps) {
  const [tradingMode, setTradingMode] = useState<'manual' | 'automated'>('manual');
  const [isSystemActive, setIsSystemActive] = useState(false);
  const { toast } = useToast();

  const activeBots = tradeBotSystem.getBots().filter(bot => bot.isActive).length;
  const riskStatus = riskEnforcement.getRiskEnforcementStatus();

  const handleModeChange = (automated: boolean) => {
    const newMode = automated ? 'automated' : 'manual';
    setTradingMode(newMode);
    
    toast({
      title: `Switched to ${newMode} mode`,
      description: automated 
        ? "Trading bots can now execute trades when activated"
        : "You have full manual control over all trades"
    });
  };

  const handleSystemToggle = (active: boolean) => {
    setIsSystemActive(active);
    
    if (active && !riskStatus.tradingAllowed) {
      toast({
        title: "Trading System Blocked",
        description: "Risk governors are preventing trading activation",
        variant: "destructive"
      });
      setIsSystemActive(false);
      return;
    }

    toast({
      title: active ? "Live Trading Activated" : "Live Trading Deactivated",
      description: active 
        ? "System is now monitoring markets and can execute trades"
        : "All automated trading has been paused",
      variant: active ? "default" : "destructive"
    });
  };

  return (
    <div className="space-y-4">
      {/* Trading Mode Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Live Trading Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label htmlFor="mode-toggle">Manual Control</Label>
            </div>
            <Switch
              id="mode-toggle"
              checked={tradingMode === 'automated'}
              onCheckedChange={handleModeChange}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="mode-toggle">Bot Control</Label>
              <Bot className="w-4 h-4" />
            </div>
          </div>

          {/* Current Mode Display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Mode:</span>
            <Badge variant={tradingMode === 'automated' ? 'default' : 'secondary'}>
              {tradingMode === 'automated' ? 'Automated' : 'Manual'}
            </Badge>
          </div>

          {/* System Status */}
          {tradingMode === 'automated' && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="system-toggle">System Active</Label>
                  <Switch
                    id="system-toggle"
                    checked={isSystemActive}
                    onCheckedChange={handleSystemToggle}
                    disabled={!riskStatus.tradingAllowed}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Active Bots:</span>
                    <span className="font-semibold">{activeBots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Level:</span>
                    <Badge variant={riskStatus.enforcementLevel === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {riskStatus.enforcementLevel}
                    </Badge>
                  </div>
                </div>

                {!riskStatus.tradingAllowed && (
                  <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-xs text-destructive">Risk governors blocking trades</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trading Interface */}
      {tradingMode === 'manual' ? (
        <ManualOrderCard />
      ) : (
        <LiveTradingMonitor 
          isSystemActive={isSystemActive}
        />
      )}

      {/* Risk & Compliance Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" />
            Risk & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Trading Status:</span>
              <Badge variant={riskStatus.tradingAllowed ? 'secondary' : 'destructive'} className="text-xs">
                {riskStatus.tradingAllowed ? 'Allowed' : 'Blocked'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Daily Loss:</span>
              <span className={`font-semibold ${riskStatus.dailyLossPercent > 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {riskStatus.dailyLossPercent.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="p-2 bg-muted/30 rounded-md">
            <p className="text-xs text-muted-foreground">
              All trades are validated by Monarch & Overseer risk governors before execution.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo Mode Warning */}
      {isDemo && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Demo Mode: All trades are simulated with paper trading data
            </span>
          </div>
        </div>
      )}
    </div>
  );
}