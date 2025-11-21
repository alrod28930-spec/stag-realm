import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, AlertTriangle, DollarSign } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface Trade {
  id: string
  timestamp: string
  symbol: string
  side: string
  quantity: number
  price: number
  fees: number
  pnl?: number | null
}

interface KPIData {
  winRate: number
  sharpe: number
  maxDrawdown: number
  expectancy: number
  avgHoldHours: number
  totalPnL: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
}

export function KPIDisplay() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(false)

  const calculateKPIs = async () => {
    setLoading(true)
    try {
      // Fetch sample trades - in real app, this would come from your trades table
      const { data: trades, error } = await supabase
        .from('bid_learning_events')
        .select('*')
        .eq('event_type', 'trade.closed')
        .limit(100)

      if (error) throw error

      // Transform to expected format
      const formattedTrades: Trade[] = (trades || []).map(t => ({
        id: t.id,
        timestamp: t.ts || new Date().toISOString(),
        symbol: t.symbol || 'UNKNOWN',
        side: 'buy',
        quantity: 1,
        price: 100,
        fees: 0,
        pnl: t.pnl
      }))

      const { data, error: funcError } = await supabase.functions.invoke('kpis-lite', {
        body: { trades: formattedTrades }
      })

      if (funcError) throw funcError

      setKpis(data as KPIData)
      toast.success("KPIs calculated successfully")
    } catch (error) {
      console.error('KPI calculation error:', error)
      toast.error("Failed to calculate KPIs")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Trading Performance KPIs
          <Button onClick={calculateKPIs} disabled={loading} size="sm">
            {loading ? "Calculating..." : "Calculate KPIs"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!kpis ? (
          <p className="text-muted-foreground text-sm">
            Click "Calculate KPIs" to analyze your trading performance
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" />
                Win Rate
              </div>
              <div className="text-2xl font-bold">{kpis.winRate}%</div>
              <div className="text-xs text-muted-foreground">
                {kpis.winningTrades}W / {kpis.losingTrades}L
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                Total P&L
              </div>
              <div className={`text-2xl font-bold ${kpis.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${kpis.totalPnL}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpis.totalTrades} trades
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                Sharpe Ratio
              </div>
              <div className="text-2xl font-bold">{kpis.sharpe}</div>
              <div className="text-xs text-muted-foreground">
                Risk-adjusted return
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                Max Drawdown
              </div>
              <div className="text-2xl font-bold text-red-500">
                {kpis.maxDrawdown}%
              </div>
              <div className="text-xs text-muted-foreground">
                Largest peak-to-trough
              </div>
            </div>

            <div className="space-y-1 col-span-2">
              <div className="text-sm text-muted-foreground">Expectancy</div>
              <div className="text-xl font-semibold">${kpis.expectancy}</div>
              <div className="text-xs text-muted-foreground">Average per trade</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Avg Win</div>
              <div className="text-xl font-semibold text-green-500">${kpis.avgWin}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Avg Loss</div>
              <div className="text-xl font-semibold text-red-500">${kpis.avgLoss}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
