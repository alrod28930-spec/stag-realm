import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function BacktestPanel() {
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("SPY");
  const [tf, setTf] = useState("1H");
  const [fromDate, setFromDate] = useState("2024-09-01");
  const [toDate, setToDate] = useState("2024-09-15");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runBacktest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("backtest-run", {
        body: {
          symbol,
          tf,
          fromISO: `${fromDate}T00:00:00Z`,
          toISO: `${toDate}T23:59:59Z`,
        },
      });

      if (error) throw error;

      if (data?.ok) {
        setResult(data.result);
        toast({
          title: "Backtest Complete",
          description: `${data.symbol} @ ${data.tf}: ${data.result.trades} trades`,
        });
      } else {
        throw new Error(data?.error || "Backtest failed");
      }
    } catch (err: any) {
      console.error("Backtest error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to run backtest",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backtest Engine</CardTitle>
        <CardDescription>Test deterministic strategies on historical data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Symbol</Label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <div>
            <Label>Timeframe</Label>
            <Input value={tf} onChange={(e) => setTf(e.target.value)} />
          </div>
          <div>
            <Label>From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <Button onClick={runBacktest} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Backtest
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Results</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Trades: {result.trades}</div>
              <div>Win Rate: {(result.win_rate * 100).toFixed(1)}%</div>
              <div>PnL (bp): {result.pnl_bp}</div>
              <div>Avg R:R: {result.avg_rr.toFixed(2)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
