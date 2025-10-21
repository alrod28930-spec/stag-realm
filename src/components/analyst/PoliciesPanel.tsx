/**
 * Policies Panel - Phase V
 * Manage RL policies (Active, Shadow, Candidate, Archived)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Pause, Archive, Eye, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Policy {
  id: string;
  name: string;
  params: Record<string, any>;
  status: 'candidate' | 'shadow' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export function PoliciesPanel() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [editedParams, setEditedParams] = useState('');

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { data: wm } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .single();
      
      if (!wm) return;

      const { data, error } = await supabase
        .from('rl_policies')
        .select('*')
        .eq('workspace_id', wm.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies((data || []).map(d => ({
        ...d,
        params: d.params as Record<string, any>,
        status: d.status as 'candidate' | 'shadow' | 'active' | 'archived'
      })));
    } catch (err: any) {
      console.error('Failed to load policies:', err);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (policyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('rl_policies')
        .update({ status: newStatus })
        .eq('id', policyId);

      if (error) throw error;
      toast.success(`Policy status updated to ${newStatus}`);
      await loadPolicies();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update policy status');
    }
  };

  const handleStartShadowTest = async (policy: Policy) => {
    try {
      const { data: wm } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .single();
      
      if (!wm) return;

      // Set policy to shadow
      await handleStatusChange(policy.id, 'shadow');

      // Create A/B experiment (need active policy as baseline)
      const activePolicy = policies.find(p => p.status === 'active');
      if (!activePolicy) {
        toast.error('No active policy to compare against');
        return;
      }

      const { error } = await supabase
        .from('ab_experiments')
        .insert({
          workspace_id: wm.workspace_id,
          name: `Shadow Test: ${policy.name}`,
          a_policy_id: activePolicy.id,
          b_policy_id: policy.id,
          status: 'running'
        });

      if (error) throw error;
      toast.success('Shadow test started - will run for 7 days');
    } catch (err: any) {
      console.error('Failed to start shadow test:', err);
      toast.error('Failed to start shadow test');
    }
  };

  const handleSaveParams = async () => {
    if (!selectedPolicy) return;

    try {
      const params = JSON.parse(editedParams);
      
      const { error } = await supabase
        .from('rl_policies')
        .update({ params })
        .eq('id', selectedPolicy.id);

      if (error) throw error;
      toast.success('Policy parameters updated');
      setSelectedPolicy(null);
      await loadPolicies();
    } catch (err: any) {
      console.error('Failed to save params:', err);
      toast.error('Invalid JSON or save failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      shadow: 'secondary',
      candidate: 'outline',
      archived: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="p-4">Loading policies...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>RL Policies</CardTitle>
          <CardDescription>
            Manage trading policies - Active, Shadow, Candidate, or Archived
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {policies.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No policies yet. Policies are created automatically by the RL improvement system.
              </div>
            ) : (
              policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{policy.name}</span>
                      {getStatusBadge(policy.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Risk: {(policy.params?.risk_pct || 0.02) * 100}% | 
                      SL: {(policy.params?.stop_loss || 0.02) * 100}% | 
                      TP: {(policy.params?.take_profit || 0.04) * 100}%
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setEditedParams(JSON.stringify(policy.params, null, 2));
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Policy: {policy.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            value={editedParams}
                            onChange={(e) => setEditedParams(e.target.value)}
                            rows={12}
                            className="font-mono text-xs"
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleSaveParams}>Save Changes</Button>
                            <Button variant="outline" onClick={() => setSelectedPolicy(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {policy.status === 'candidate' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartShadowTest(policy)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Shadow Test
                      </Button>
                    )}

                    {policy.status === 'shadow' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(policy.id, 'candidate')}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    )}

                    {policy.status !== 'archived' && policy.status !== 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(policy.id, 'archived')}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
