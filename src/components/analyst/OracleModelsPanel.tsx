/**
 * Oracle Models Panel - Phase V
 * Manage ensemble Oracle models and weights
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface OracleModel {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  params: Record<string, any>;
  updated_at: string;
}

export function OracleModelsPanel() {
  const [models, setModels] = useState<OracleModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const { data: wm } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .single();
      
      if (!wm) return;

      const { data, error } = await supabase
        .from('oracle_models')
        .select('*')
        .eq('workspace_id', wm.workspace_id)
        .order('name');

      if (error) throw error;
      setModels((data || []).map(d => ({
        ...d,
        params: d.params as Record<string, any>
      })));
    } catch (err: any) {
      console.error('Failed to load models:', err);
      toast.error('Failed to load Oracle models');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (modelId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('oracle_models')
        .update({ enabled })
        .eq('id', modelId);

      if (error) throw error;
      toast.success(`Model ${enabled ? 'enabled' : 'disabled'}`);
      await loadModels();
    } catch (err: any) {
      console.error('Failed to toggle model:', err);
      toast.error('Failed to update model');
    }
  };

  const handleWeightChange = async (modelId: string, weight: number) => {
    try {
      const { error } = await supabase
        .from('oracle_models')
        .update({ weight })
        .eq('id', modelId);

      if (error) throw error;
      
      // Update local state
      setModels(prev => prev.map(m => 
        m.id === modelId ? { ...m, weight } : m
      ));
    } catch (err: any) {
      console.error('Failed to update weight:', err);
      toast.error('Failed to update weight');
    }
  };

  const handleNormalizeWeights = async () => {
    try {
      const enabledModels = models.filter(m => m.enabled);
      if (enabledModels.length === 0) return;

      const equalWeight = 1.0 / enabledModels.length;
      
      for (const model of enabledModels) {
        await supabase
          .from('oracle_models')
          .update({ weight: equalWeight })
          .eq('id', model.id);
      }

      toast.success('Weights normalized');
      await loadModels();
    } catch (err: any) {
      console.error('Failed to normalize:', err);
      toast.error('Failed to normalize weights');
    }
  };

  const handleRunEnsemble = async () => {
    try {
      const { error } = await supabase.functions.invoke('oracle-ensemble', {
        body: { symbols: ['SPY', 'QQQ', 'AAPL'], tf: '1H' }
      });

      if (error) throw error;
      toast.success('Ensemble Oracle executed successfully');
    } catch (err: any) {
      console.error('Failed to run ensemble:', err);
      toast.error('Failed to run ensemble');
    }
  };

  const totalWeight = models
    .filter(m => m.enabled)
    .reduce((sum, m) => sum + m.weight, 0);

  if (loading) {
    return <div className="p-4">Loading Oracle models...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ensemble Oracle Models</CardTitle>
              <CardDescription>
                Configure signal models and their weights
              </CardDescription>
            </div>
            <Button onClick={handleRunEnsemble} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total Weight (Enabled)</span>
              <span className={totalWeight !== 1.0 ? 'text-destructive' : 'text-primary'}>
                {totalWeight.toFixed(3)}
              </span>
              <Button variant="outline" size="sm" onClick={handleNormalizeWeights}>
                Normalize
              </Button>
            </div>

            {models.map((model) => (
              <div key={model.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={model.enabled}
                      onCheckedChange={(enabled) => handleToggle(model.id, enabled)}
                    />
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.params?.period && `Period: ${model.params.period}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono">
                    {(model.weight * 100).toFixed(1)}%
                  </div>
                </div>

                {model.enabled && (
                  <div className="space-y-2">
                    <Slider
                      value={[model.weight]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={([value]) => handleWeightChange(model.id, value)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
