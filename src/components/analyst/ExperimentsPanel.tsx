/**
 * Experiments Panel - Phase V
 * View and manage A/B experiments for shadow testing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';

interface Experiment {
  id: string;
  name: string;
  a_policy_id: string;
  b_policy_id: string;
  status: 'running' | 'stopped' | 'promoted';
  started_at: string;
  stopped_at: string | null;
}

interface PolicyMetrics {
  trades: number;
  win_rate: number;
  pnl_bp: number;
  sharpe: number;
}

export function ExperimentsPanel() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, PolicyMetrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExperiments();
  }, []);

  const loadExperiments = async () => {
    try {
      const { data: wm } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .single();
      
      if (!wm) return;

      const { data, error } = await supabase
        .from('ab_experiments')
        .select('*')
        .eq('workspace_id', wm.workspace_id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setExperiments((data || []).map(d => ({
        ...d,
        status: d.status as 'running' | 'stopped' | 'promoted'
      })));

      // Load metrics for each policy
      const policyIds = new Set<string>();
      data?.forEach((exp) => {
        policyIds.add(exp.a_policy_id);
        policyIds.add(exp.b_policy_id);
      });

      const metricsData: Record<string, PolicyMetrics> = {};
      for (const policyId of policyIds) {
        const { data: results } = await supabase
          .from('rl_policy_results')
          .select('*')
          .eq('policy_id', policyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (results && results.length > 0) {
          metricsData[policyId] = {
            trades: results.reduce((sum, r) => sum + r.trades, 0),
            win_rate: results.reduce((sum, r) => sum + r.win_rate, 0) / results.length,
            pnl_bp: results.reduce((sum, r) => sum + r.pnl_bp, 0),
            sharpe: results.reduce((sum, r) => sum + (r.sharpe || 0), 0) / results.length
          };
        }
      }
      setMetricsMap(metricsData);
    } catch (err: any) {
      console.error('Failed to load experiments:', err);
      toast.error('Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (experimentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ab-evaluate', {
        body: { experiment_id: experimentId }
      });

      if (error) throw error;

      if (data.recommend) {
        toast.success(`Recommendation: PROMOTE candidate (Score: ${data.scoreB.toFixed(3)})`);
      } else {
        toast.info(`Not ready to promote: ${data.reason}`);
      }
    } catch (err: any) {
      console.error('Failed to evaluate:', err);
      toast.error('Failed to evaluate experiment');
    }
  };

  const handlePromote = async (experiment: Experiment) => {
    try {
      // Update experiment status
      await supabase
        .from('ab_experiments')
        .update({ status: 'promoted', stopped_at: new Date().toISOString() })
        .eq('id', experiment.id);

      // Set B policy to active
      await supabase
        .from('rl_policies')
        .update({ status: 'active' })
        .eq('id', experiment.b_policy_id);

      // Archive A policy
      await supabase
        .from('rl_policies')
        .update({ status: 'archived' })
        .eq('id', experiment.a_policy_id);

      toast.success('Candidate policy promoted to active!');
      await loadExperiments();
    } catch (err: any) {
      console.error('Failed to promote:', err);
      toast.error('Failed to promote policy');
    }
  };

  const handleStop = async (experimentId: string) => {
    try {
      await supabase
        .from('ab_experiments')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('id', experimentId);

      toast.success('Experiment stopped');
      await loadExperiments();
    } catch (err: any) {
      console.error('Failed to stop:', err);
      toast.error('Failed to stop experiment');
    }
  };

  const renderMetrics = (policyId: string, label: string) => {
    const metrics = metricsMap[policyId];
    if (!metrics) {
      return <div className="text-sm text-muted-foreground">{label}: No data</div>;
    }

    return (
      <div className="space-y-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Trades: {metrics.trades}</div>
          <div>WR: {(metrics.win_rate * 100).toFixed(1)}%</div>
          <div>PnL: {metrics.pnl_bp.toFixed(0)} bp</div>
          <div>Sharpe: {metrics.sharpe.toFixed(2)}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-4">Loading experiments...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>A/B Experiments</CardTitle>
          <CardDescription>
            Shadow testing results and promotion recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {experiments.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No experiments running. Start a shadow test from the Policies tab.
              </div>
            ) : (
              experiments.map((exp) => (
                <Card key={exp.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{exp.name}</CardTitle>
                        <CardDescription>
                          Started {new Date(exp.started_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={exp.status === 'running' ? 'default' : 'secondary'}>
                        {exp.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 border rounded-lg">
                        {renderMetrics(exp.a_policy_id, 'Baseline (A)')}
                      </div>
                      <div className="p-3 border rounded-lg">
                        {renderMetrics(exp.b_policy_id, 'Candidate (B)')}
                      </div>
                    </div>

                    {exp.status === 'running' && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEvaluate(exp.id)}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Evaluate & Recommend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromote(exp)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Promote Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStop(exp.id)}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
