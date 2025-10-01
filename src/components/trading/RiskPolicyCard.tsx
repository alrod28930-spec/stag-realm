/**
 * Risk Policy Card - Configure workspace trading limits
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Save, RotateCcw } from 'lucide-react';

interface RiskPolicy {
  workspace_id: string;
  max_notional_per_trade: number;
  max_positions: number;
  max_trades_per_day: number;
  max_daily_loss_pct: number;
  cooldown_after_loss_secs: number;
  require_stop_loss: boolean;
  allow_premarket: boolean;
  allow_postmarket: boolean;
  min_liquidity_volume: number;
  max_spread_pct: number;
  market_data_freshness_ms: number;
}

interface RiskPolicyCardProps {
  workspaceId: string;
}

export function RiskPolicyCard({ workspaceId }: RiskPolicyCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<RiskPolicy | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, [workspaceId]);

  const loadPolicy = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_policies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPolicy(data as RiskPolicy);
      } else {
        // Create default policy
        const { data: newPolicy, error: createError } = await supabase
          .from('risk_policies')
          .insert({ workspace_id: workspaceId })
          .select()
          .single();

        if (createError) throw createError;
        setPolicy(newPolicy as RiskPolicy);
      }
    } catch (err) {
      console.error('Failed to load risk policy:', err);
      toast({
        title: 'Error',
        description: 'Failed to load risk policy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!policy) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('risk_policies')
        .upsert(policy);

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Risk policy saved successfully',
      });
    } catch (err) {
      console.error('Failed to save risk policy:', err);
      toast({
        title: 'Error',
        description: 'Failed to save risk policy',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadPolicy();
    setHasChanges(false);
  };

  const updatePolicy = (field: keyof RiskPolicy, value: any) => {
    if (!policy) return;
    setPolicy({ ...policy, [field]: value });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!policy) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Policy
            </CardTitle>
            <CardDescription>
              Configure trading limits and safety controls
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Server-Enforced
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Limits */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Capital & Exposure Limits</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-notional">Max $ Per Trade</Label>
              <Input
                id="max-notional"
                type="number"
                value={policy.max_notional_per_trade}
                onChange={(e) => updatePolicy('max_notional_per_trade', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Never exceeds 2% of equity
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-positions">Max Concurrent Positions</Label>
              <Input
                id="max-positions"
                type="number"
                value={policy.max_positions}
                onChange={(e) => updatePolicy('max_positions', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-trades">Max Trades Per Day</Label>
              <Input
                id="max-trades"
                type="number"
                value={policy.max_trades_per_day}
                onChange={(e) => updatePolicy('max_trades_per_day', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-loss">Max Daily Loss %</Label>
              <Input
                id="max-loss"
                type="number"
                step="0.01"
                value={(policy.max_daily_loss_pct * 100).toFixed(2)}
                onChange={(e) => updatePolicy('max_daily_loss_pct', parseFloat(e.target.value) / 100)}
              />
              <p className="text-xs text-muted-foreground">
                Triggers circuit breaker when hit
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Risk Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Mandatory Risk Controls</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Stop Loss</Label>
              <p className="text-xs text-muted-foreground">
                Reject orders without stop-loss
              </p>
            </div>
            <Switch
              checked={policy.require_stop_loss}
              onCheckedChange={(checked) => updatePolicy('require_stop_loss', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown">Cooldown After Loss (seconds)</Label>
            <Input
              id="cooldown"
              type="number"
              value={policy.cooldown_after_loss_secs}
              onChange={(e) => updatePolicy('cooldown_after_loss_secs', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Prevents revenge trading
            </p>
          </div>
        </div>

        <Separator />

        {/* Market Conditions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Market Conditions</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-volume">Min Daily Volume</Label>
              <Input
                id="min-volume"
                type="number"
                value={policy.min_liquidity_volume}
                onChange={(e) => updatePolicy('min_liquidity_volume', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum shares traded per day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-spread">Max Spread %</Label>
              <Input
                id="max-spread"
                type="number"
                step="0.001"
                value={(policy.max_spread_pct * 100).toFixed(3)}
                onChange={(e) => updatePolicy('max_spread_pct', parseFloat(e.target.value) / 100)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freshness">Market Data Freshness (ms)</Label>
            <Input
              id="freshness"
              type="number"
              step="1000"
              value={policy.market_data_freshness_ms}
              onChange={(e) => updatePolicy('market_data_freshness_ms', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Block trades if data is older than this
            </p>
          </div>
        </div>

        <Separator />

        {/* Time Rules */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Time Rules</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Pre-Market Trading</Label>
                <p className="text-xs text-muted-foreground">
                  Before 9:30 AM ET
                </p>
              </div>
              <Switch
                checked={policy.allow_premarket}
                onCheckedChange={(checked) => updatePolicy('allow_premarket', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Post-Market Trading</Label>
                <p className="text-xs text-muted-foreground">
                  After 4:00 PM ET
                </p>
              </div>
              <Switch
                checked={policy.allow_postmarket}
                onCheckedChange={(checked) => updatePolicy('allow_postmarket', checked)}
              />
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        )}

        <div className="rounded-lg bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Critical Safety Notice</p>
              <p className="text-muted-foreground mt-1">
                These limits are enforced server-side before every trade. 
                No order can bypass these controls. Adjust with caution.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
