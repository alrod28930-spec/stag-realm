import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PredictiveScore {
  workspace_id: string;
  symbol: string;
  tf: string;
  score: number;
  sentiment: number;
  anomaly: number;
  price_momentum: number;
  updated_at: string;
}

export function PredictiveDashboard() {
  const [scores, setScores] = useState<PredictiveScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadScores = async () => {
    try {
      setLoading(true);
      const { data: workspace } = await supabase.rpc("ensure_default_workspace");
      
      const { data, error } = await supabase
        .from("oracle_predictive")
        .select("*")
        .eq("workspace_id", workspace)
        .order("score", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setScores(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to load predictive scores:", err);
      toast.error("Failed to load predictive scores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
    const interval = setInterval(loadScores, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getSentimentBadge = (sentiment: number) => {
    if (sentiment >= 0.3) return <Badge variant="default" className="bg-success">Positive</Badge>;
    if (sentiment <= -0.3) return <Badge variant="destructive">Negative</Badge>;
    return <Badge variant="secondary">Neutral</Badge>;
  };

  const getAnomalyBadge = (anomaly: number) => {
    if (anomaly >= 0.5) return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />High Vol</Badge>;
    if (anomaly >= 0.3) return <Badge variant="secondary" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Med Vol</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default" className="bg-primary flex items-center gap-1"><TrendingUp className="h-3 w-3" />Confident</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Moderate</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Predictive Dashboard</CardTitle>
            <CardDescription>
              Real-time fusion of price momentum, sentiment, and anomaly detection
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadScores}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && scores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Loading predictive scores...</div>
        ) : scores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No predictive data available. Run oracle-predictive-merge to generate scores.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Anomaly</TableHead>
                <TableHead>Momentum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((s) => (
                <TableRow key={`${s.symbol}-${s.tf}`}>
                  <TableCell className="font-medium">{s.symbol}</TableCell>
                  <TableCell>{s.tf}</TableCell>
                  <TableCell>{getConfidenceBadge(s.score)}</TableCell>
                  <TableCell>
                    <span className={s.score >= 0.7 ? "text-success font-semibold" : ""}>
                      {(s.score * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSentimentBadge(s.sentiment)}
                      <span className="text-sm text-muted-foreground">
                        {s.sentiment >= 0 ? '+' : ''}{(s.sentiment * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getAnomalyBadge(s.anomaly)}
                      <span className="text-sm text-muted-foreground">
                        {(s.anomaly * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={s.price_momentum >= 0.6 ? "text-success" : s.price_momentum <= 0.4 ? "text-destructive" : ""}>
                      {(s.price_momentum * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
