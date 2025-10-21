import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PortfolioPlan {
  symbol: string;
  alloc: number;
  size: number;
  win_rate: number;
  avg_rr: number;
  volatility: number;
}

export function PortfolioPlannerPanel() {
  const [symbols, setSymbols] = useState("SPY,QQQ,META");
  const [capital, setCapital] = useState("100000");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PortfolioPlan[]>([]);
  const [totalAlloc, setTotalAlloc] = useState(0);
  const { toast } = useToast();

  const generatePlan = async () => {
    setLoading(true);
    try {
      const symbolList = symbols.split(",").map(s => s.trim()).filter(Boolean);
      const capitalNum = parseFloat(capital);

      if (symbolList.length === 0 || isNaN(capitalNum) || capitalNum <= 0) {
        toast({
          title: "Invalid Input",
          description: "Please enter valid symbols and capital",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyst-portfolio-plan", {
        body: { symbols: symbolList, capital: capitalNum }
      });

      if (error) throw error;

      if (data?.ok) {
        setPlans(data.plans || []);
        setTotalAlloc(data.totalAlloc || 0);
        toast({
          title: "Portfolio Plan Generated",
          description: `${data.plans.length} positions planned, ${(data.totalAlloc * 100).toFixed(1)}% allocated`,
        });
      } else {
        throw new Error(data?.message || "Failed to generate plan");
      }
    } catch (err: any) {
      console.error("Portfolio plan error:", err);
      toast({
        title: "Plan Generation Failed",
        description: err.message || "Unknown error",
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
            <PieChart className="h-5 w-5" />
            Portfolio Planner
          </CardTitle>
          <CardDescription>Generate allocation-aware plans across multiple symbols</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols (comma-separated)</Label>
              <Input
                id="symbols"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="SPY,QQQ,META"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital">Total Capital ($)</Label>
              <Input
                id="capital"
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>

          <Button onClick={generatePlan} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Portfolio Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation Plan</CardTitle>
            <CardDescription>
              Total Allocation: {(totalAlloc * 100).toFixed(2)}% | Capital: ${parseFloat(capital).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.symbol} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">{plan.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        Allocation: {(plan.alloc * 100).toFixed(2)}% (${plan.size.toLocaleString()})
                      </div>
                    </div>
                    <Badge variant={plan.win_rate > 0.5 ? "default" : "secondary"}>
                      WR: {(plan.win_rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg RR:</span> {plan.avg_rr.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vol:</span> {(plan.volatility * 100).toFixed(2)}%
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span> ${plan.size.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
