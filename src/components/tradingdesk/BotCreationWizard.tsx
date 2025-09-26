import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Wand2, Target, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BotCreationWizardProps {
  onBotCreated?: () => void;
}

const STRATEGY_TEMPLATES = [
  {
    name: 'Conservative Growth',
    strategy: 'mean_reversion',
    risk: 'low',
    target: 0.005, // 0.5% daily
    description: 'Low-risk mean reversion strategy focusing on stable returns'
  },
  {
    name: 'Momentum Trader',
    strategy: 'momentum',
    risk: 'medium',
    target: 0.01, // 1% daily
    description: 'Follows market momentum with balanced risk management'
  },
  {
    name: 'Breakout Hunter',
    strategy: 'breakout',
    risk: 'high',
    target: 0.02, // 2% daily
    description: 'Aggressive breakout strategy for experienced traders'
  },
  {
    name: 'Scalping Pro',
    strategy: 'scalping',
    risk: 'high',
    target: 0.015, // 1.5% daily
    description: 'High-frequency scalping for quick profits'
  }
];

export function BotCreationWizard({ onBotCreated }: BotCreationWizardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [botName, setBotName] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const selectedStrategy = STRATEGY_TEMPLATES.find(t => t.name === selectedTemplate);

  const handleCreate = async () => {
    if (!selectedTemplate || !botName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a strategy template and enter a bot name",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const template = STRATEGY_TEMPLATES.find(t => t.name === selectedTemplate);
      if (!template) throw new Error('Invalid template');

      const targetReturn = customTarget ? 
        parseFloat(customTarget) / 100 : 
        template.target;

      // Create bot profile in database
      const { error } = await supabase
        .from('bot_profiles')
        .insert({
          workspace_id: user.user_metadata?.workspace_id || user.id,
          name: botName,
          risk_indicator: template.risk,
          daily_return_target_pct: targetReturn,
          active: false,
          mode: 'standard',
          execution_mode: 'paper', // Start in paper mode
          // Set other defaults based on risk level
          capital_risk_pct: template.risk === 'low' ? 0.02 : template.risk === 'medium' ? 0.05 : 0.1,
          max_trades_per_day: template.risk === 'low' ? 2 : template.risk === 'medium' ? 4 : 6,
          risk_per_trade_pct: template.risk === 'low' ? 0.005 : template.risk === 'medium' ? 0.01 : 0.02
        });

      if (error) throw error;

      // Log bot creation event
      await supabase.from('rec_events').insert({
        workspace_id: user.user_metadata?.workspace_id || user.id,
        user_id: user.id,
        event_type: 'bot.created',
        severity: 1,
        entity_type: 'bot',
        entity_id: botName,
        summary: `Created new ${template.name} bot: ${botName}`,
        payload_json: {
          bot_name: botName,
          strategy: template.strategy,
          risk_level: template.risk,
          target_return: targetReturn
        }
      });

      toast({
        title: "Bot Created Successfully",
        description: `${botName} has been created and is ready for deployment`
      });

      // Reset form
      setSelectedTemplate('');
      setBotName('');
      setCustomTarget('');
      
      if (onBotCreated) {
        onBotCreated();
      }

    } catch (error: any) {
      toast({
        title: "Failed to Create Bot",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-amber-600';  
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Create New Trading Bot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Template Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Choose Strategy Template</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STRATEGY_TEMPLATES.map((template) => (
              <div
                key={template.name}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedTemplate === template.name
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => setSelectedTemplate(template.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{template.name}</h4>
                  <Badge variant={getRiskBadgeVariant(template.risk)}>
                    {template.risk} risk
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4" />
                  <span>Target: {(template.target * 100).toFixed(1)}% daily</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <>
            <Separator />
            
            {/* Bot Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-name">Bot Name</Label>
                <Input
                  id="bot-name"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Enter a name for your bot"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-target">
                  Custom Daily Target (%)
                  <span className="text-muted-foreground ml-1">(optional)</span>
                </Label>
                <Input
                  id="custom-target"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder={`Default: ${(selectedStrategy?.target || 0) * 100}%`}
                />
              </div>
            </div>

            <Separator />

            {/* Configuration Summary */}
            <div className="p-4 bg-muted/20 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Configuration Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Strategy:</span>
                  <span className="ml-2 font-medium">{selectedStrategy?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk Level:</span>
                  <Badge variant={getRiskBadgeVariant(selectedStrategy?.risk || '')} className="ml-2">
                    {selectedStrategy?.risk}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Target:</span>
                  <span className="ml-2 font-medium">
                    {customTarget ? `${customTarget}%` : `${((selectedStrategy?.target || 0) * 100).toFixed(1)}%`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Initial Mode:</span>
                  <span className="ml-2 font-medium">Paper Trading</span>
                </div>
              </div>
            </div>

            {/* Risk Warning */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="space-y-0.5">
                    <li>• Bot will start in paper trading mode for safety</li>
                    <li>• You can switch to live trading after testing</li>
                    <li>• All trades are subject to risk management controls</li>
                    <li>• Performance targets are goals, not guarantees</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Create Button */}
            <Button 
              onClick={handleCreate} 
              className="w-full" 
              disabled={!botName.trim() || isCreating}
            >
              {isCreating ? (
                <>Creating Bot...</>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Create Trading Bot
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}