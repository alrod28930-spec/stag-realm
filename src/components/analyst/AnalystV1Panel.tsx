import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, TrendingUp, Shield, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Analyst v1 - Deterministic Planning Demo
 * No LLM calls - pure rule-based logic using BID + Oracle data
 */
export const AnalystV1Panel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [tf, setTf] = useState('1H');
  const [candidates, setCandidates] = useState('');

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to use the Analyst",
          variant: "destructive"
        });
        return;
      }

      const candidatesList = candidates 
        ? candidates.split(',').map(s => s.trim()).filter(s => s)
        : undefined;

      const { data, error } = await supabase.functions.invoke('analyst-core', {
        body: {
          user_id: user.id,
          tf,
          candidates: candidatesList,
          flags: {
            paper_only: true,
            allow_live_trades: false
          }
        }
      });

      if (error) throw error;

      setPlan(data);
      
      toast({
        title: "Plan generated",
        description: `Deterministic plan for ${data.plan?.symbol} on ${data.plan?.tf}`,
      });
    } catch (err: any) {
      console.error('Analyst error:', err);
      toast({
        title: "Planning failed",
        description: err.message || "Failed to generate plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analyst v1 - Deterministic Engine
          </CardTitle>
          <CardDescription>
            Pure rule-based planning using BID stats + Oracle signals (no LLM)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tf">Timeframe</Label>
              <Input
                id="tf"
                value={tf}
                onChange={(e) => setTf(e.target.value)}
                placeholder="1H"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidates">Candidates (optional)</Label>
              <Input
                id="candidates"
                value={candidates}
                onChange={(e) => setCandidates(e.target.value)}
                placeholder="META,QQQ,SPY"
              />
            </div>
          </div>

          <Button 
            onClick={generatePlan} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate Plan'}
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Trading Plan</span>
                <Badge variant={plan.validation?.ok ? "default" : "destructive"}>
                  {plan.validation?.ok ? 'Valid' : 'Invalid'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Symbol</div>
                  <div className="text-2xl font-bold">{plan.plan?.symbol}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Timeframe</div>
                  <div className="text-2xl font-bold">{plan.plan?.tf}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Entry Logic</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.plan?.entry_logic}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Side</div>
                  <Badge variant={plan.plan?.side === 'buy' ? 'default' : 'secondary'}>
                    {plan.plan?.side?.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Risk %</div>
                  <div className="text-lg font-semibold">
                    {(plan.plan?.size_logic?.risk_pct * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Qty Est.</div>
                  <div className="text-lg font-semibold">
                    {plan.plan?.size_logic?.qty_estimate}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Stops</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Stop Loss</div>
                    <div className="text-lg font-semibold text-destructive">
                      {(plan.plan?.stops?.stop_loss * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Take Profit</div>
                    <div className="text-lg font-semibold text-green-600">
                      {(plan.plan?.stops?.take_profit * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${plan.plan?.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    {(plan.plan?.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">{plan.plan?.notes}</p>
              </div>
            </CardContent>
          </Card>

          {plan.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Supporting Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.metadata.bid_stats && (
                  <div className="text-sm">
                    <span className="font-medium">User Stats:</span>{' '}
                    {plan.metadata.bid_stats.trades} trades, {' '}
                    {(plan.metadata.bid_stats.win_rate * 100).toFixed(0)}% win rate, {' '}
                    {plan.metadata.bid_stats.avg_rr.toFixed(2)}x avg RR
                  </div>
                )}
                {plan.metadata.oracle_score && (
                  <div className="text-sm">
                    <span className="font-medium">Oracle Score:</span>{' '}
                    {(plan.metadata.oracle_score.hit_rate * 100).toFixed(0)}% hit rate, {' '}
                    {plan.metadata.oracle_score.avg_edge_bp.toFixed(0)} bp avg edge
                  </div>
                )}
                {!plan.validation?.ok && (
                  <div className="pt-2 space-y-1">
                    <div className="text-sm font-medium text-destructive">Validation Issues:</div>
                    {plan.validation?.reasons?.map((reason: string, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground">• {reason}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
