import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Analyst v2 Demo Panel
 * Tests the deterministic planning engine (no LLM)
 * Shows plan JSON and state persistence
 */
export function AnalystV2Panel() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyst-core-v2", {
        body: {
          user_id: user.id,
          tf: "1H",
          candidates: ["META", "QQQ", "SPY"],
          flags: {
            paper_only: true,
            allow_live_trades: false,
          },
        },
      });

      if (error) throw error;

      if (data?.ok) {
        setPlan(data.plan);
        setMetadata(data.metadata);
        toast({
          title: "Plan Generated",
          description: `${data.plan.symbol} @ ${data.plan.tf} (confidence: ${(data.plan.confidence * 100).toFixed(1)}%)`,
        });
      } else {
        throw new Error(data?.error || "Unknown error");
      }
    } catch (err: any) {
      console.error("Analyst v2 error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Analyst v2 Engine</h2>
              <p className="text-sm text-muted-foreground">
                Deterministic planning (no LLM) • BID + Oracle learning
              </p>
            </div>
          </div>
          <Button onClick={generatePlan} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Plan
              </>
            )}
          </Button>
        </div>

        {metadata && (
          <div className="flex gap-4 mb-4">
            <Badge variant="outline">
              BID Stats: {metadata.stats_count}
            </Badge>
            <Badge variant="outline">
              Oracle Signals: {metadata.oracle_count}
            </Badge>
          </div>
        )}

        {plan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Symbol</div>
                <div className="text-2xl font-bold">{plan.symbol}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Timeframe</div>
                <div className="text-2xl font-bold">{plan.tf}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Side</div>
                <div className="text-2xl font-bold capitalize">{plan.side}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="text-2xl font-bold">
                  {(plan.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Entry Logic</div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {plan.entry_logic}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Risk Parameters</div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded space-y-1">
                  <div>Risk: {(plan.size_logic.risk_pct * 100).toFixed(2)}%</div>
                  <div>Qty: {plan.size_logic.qty_estimate}</div>
                  <div>SL: {(plan.stops.stop_loss * 100).toFixed(2)}%</div>
                  <div>TP: {(plan.stops.take_profit * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Full Plan JSON</div>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(plan, null, 2)}
              </pre>
            </div>

            <div className="text-xs text-muted-foreground">
              {plan.notes}
            </div>
          </div>
        )}

        {!plan && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            Click "Generate Plan" to see the deterministic engine in action
          </div>
        )}
      </Card>
    </div>
  );
}
