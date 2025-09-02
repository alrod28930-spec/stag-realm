import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  DollarSign, 
  Shield, 
  Target, 
  AlertTriangle,
  TrendingUp,
  Save,
  RotateCcw
} from 'lucide-react';
import { TradeBot, BotConfig } from '@/types/tradeBots';
import { tradeBotSystem } from '@/services/tradeBots';
import { useToast } from '@/hooks/use-toast';

interface BotConfigPanelProps {
  bot: TradeBot;
  onConfigUpdated?: (botId: string, config: BotConfig) => void;
}

export default function BotConfigPanel({ bot, onConfigUpdated }: BotConfigPanelProps) {
  const [config, setConfig] = useState<BotConfig>(bot.config);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const handleConfigChange = (field: keyof BotConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = () => {
    const success = tradeBotSystem.updateBotConfig(bot.id, config);
    
    if (success) {
      setHasChanges(false);
      onConfigUpdated?.(bot.id, config);
      toast({
        title: "Configuration Updated",
        description: `${bot.name} settings have been saved successfully.`,
      });
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update bot configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setConfig(bot.config);
    setHasChanges(false);
  };

  const getStrategyDescription = (strategy: string) => {
    const descriptions = {
      momentum: "Trades based on price momentum and volume confirmation",
      breakout: "Identifies and trades breakouts from consolidation patterns", 
      mean_reversion: "Identifies overbought/oversold conditions for contrarian trades",
      signal_stacking: "Combines multiple signals for high-confidence trades",
      volatility: "Exploits volatility patterns and mean reversion",
      arbitrage: "Exploits pricing inefficiencies across markets (simulation only)",
      scalping: "Rapid small trades during high liquidity periods"
    };
    return descriptions[strategy as keyof typeof descriptions] || "Custom trading strategy";
  };

  const getRiskLevel = (strategy: string) => {
    const levels = {
      momentum: 'medium',
      breakout: 'high',
      mean_reversion: 'medium', 
      signal_stacking: 'medium',
      volatility: 'low',
      arbitrage: 'low',
      scalping: 'high'
    };
    return levels[strategy as keyof typeof levels] || 'medium';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-accent/20 text-accent border-accent/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Bot Configuration
            <Badge variant="outline" className="ml-2">{bot.name}</Badge>
          </CardTitle>
          
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Strategy Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Strategy Information</Label>
          </div>
          
          <div className="bg-muted/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium capitalize">{bot.strategy.replace('_', ' ')}</span>
              <Badge className={getRiskLevelColor(getRiskLevel(bot.strategy))}>
                {getRiskLevel(bot.strategy)} risk
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getStrategyDescription(bot.strategy)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Position Sizing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Position Sizing</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPosition" className="text-xs text-muted-foreground">
                Max Position Size ($)
              </Label>
              <Input
                id="maxPosition"
                type="number"
                value={config.maxPositionSize}
                onChange={(e) => handleConfigChange('maxPositionSize', parseFloat(e.target.value) || 0)}
                min="100"
                max="50000"
                step="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxTrades" className="text-xs text-muted-foreground">
                Max Daily Trades
              </Label>
              <Input
                id="maxTrades"
                type="number"
                value={config.maxDailyTrades}
                onChange={(e) => handleConfigChange('maxDailyTrades', parseInt(e.target.value) || 0)}
                min="1"
                max="30"
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              Confidence Threshold: {(config.minConfidenceThreshold * 100).toFixed(0)}%
            </Label>
            <Slider
              value={[config.minConfidenceThreshold]}
              onValueChange={([value]) => handleConfigChange('minConfidenceThreshold', value)}
              min={0.3}
              max={0.95}
              step={0.05}
              className="w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Risk Management */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Risk Management</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stopLoss" className="text-xs text-muted-foreground">
                Stop Loss (%)
              </Label>
              <Input
                id="stopLoss"
                type="number"
                value={config.stopLossPercent}
                onChange={(e) => handleConfigChange('stopLossPercent', parseFloat(e.target.value) || 0)}
                min="1"
                max="20"
                step="0.5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="takeProfit" className="text-xs text-muted-foreground">
                Take Profit (%)
              </Label>
              <Input
                id="takeProfit"
                type="number"
                value={config.takeProfitPercent}
                onChange={(e) => handleConfigChange('takeProfitPercent', parseFloat(e.target.value) || 0)}
                min="2"
                max="50"
                step="1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDrawdown" className="text-xs text-muted-foreground">
                Max Drawdown (%)
              </Label>
              <Input
                id="maxDrawdown"
                type="number"
                value={config.maxDrawdownPercent}
                onChange={(e) => handleConfigChange('maxDrawdownPercent', parseFloat(e.target.value) || 0)}
                min="5"
                max="30"
                step="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
                Min Stock Price ($)
              </Label>
              <Input
                id="minPrice"
                type="number"
                value={config.minStockPrice}
                onChange={(e) => handleConfigChange('minStockPrice', parseFloat(e.target.value) || 0)}
                min="1"
                max="50"
                step="0.5"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Advanced Settings</Label>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Enable Paper Trading</Label>
                <p className="text-xs text-muted-foreground">
                  Test strategies without real money
                </p>
              </div>
              <Switch
                checked={true} // Always enabled for safety
                disabled={true}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Respect Oracle Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Follow risk warnings from Oracle system
                </p>
              </div>
              <Switch
                checked={true} // Always enabled for compliance
                disabled={true}
              />
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Risk Warning</p>
              <p className="text-xs text-muted-foreground">
                Automated trading involves substantial risk of loss. Only use funds you can afford to lose.
                Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}