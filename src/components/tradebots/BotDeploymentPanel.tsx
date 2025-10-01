import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square } from "lucide-react";

interface BotDeploymentPanelProps {
  bot: {
    id: string;
    name: string;
    kind: string;
    params: Record<string, any>;
    risk: {
      stop_loss_pct: number;
      take_profit_pct?: number;
      max_notional: number;
    };
  };
  onClose: () => void;
}

export function BotDeploymentPanel({ bot, onClose }: BotDeploymentPanelProps) {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState("AAPL,MSFT");
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('1h');
  const [mode, setMode] = useState<'research' | 'paper' | 'live'>('paper');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const workspaceId = user.user_metadata?.workspace_id || user.id;

      // Create strategy
      const { data: strategy, error: strategyError } = await supabase
        .from('strategies')
        .insert({
          workspace_id: workspaceId,
          owner_user_id: user.id,
          name: bot.name,
          kind: bot.kind,
          params: bot.params,
        })
        .select()
        .single();

      if (strategyError) throw strategyError;

      // Create strategy run
      const { error: runError } = await supabase
        .from('strategy_runs')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          strategy_id: strategy.id,
          status: mode,
          cfg: {
            symbols: symbols.split(',').map(s => s.trim()),
            tf: timeframe,
            kind: bot.kind,
            params: bot.params,
            risk: bot.risk,
            mode,
          },
          started_at: new Date().toISOString(),
        });

      if (runError) throw runError;

      toast({
        title: "Bot Deployed",
        description: `${bot.name} is now running in ${mode} mode`,
      });

      onClose();
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy bot',
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploy {bot.name}</CardTitle>
        <CardDescription>Configure your bot deployment settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="symbols">Symbols (comma-separated)</Label>
          <Input
            id="symbols"
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            placeholder="AAPL,MSFT,GOOGL"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeframe">Timeframe</Label>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
            <SelectTrigger id="timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="1D">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode">Execution Mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="research">Research (No Orders)</SelectItem>
              <SelectItem value="paper">Paper Trading</SelectItem>
              <SelectItem value="live">Live Trading</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
          <div className="font-medium">Risk Settings:</div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Stop Loss:</div>
            <div>{(bot.risk.stop_loss_pct * 100).toFixed(1)}%</div>
            <div>Take Profit:</div>
            <div>{((bot.risk.take_profit_pct || 0) * 100).toFixed(1)}%</div>
            <div>Max Notional:</div>
            <div>${bot.risk.max_notional}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleDeploy}
            disabled={isDeploying}
          >
            <Play className="h-4 w-4 mr-2" />
            {isDeploying ? 'Deploying...' : 'Deploy Bot'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
