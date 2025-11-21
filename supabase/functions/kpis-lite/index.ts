import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface KPIResponse {
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

function calculateKPIs(trades: Trade[]): KPIResponse {
  if (!trades || trades.length === 0) {
    return {
      winRate: 0,
      sharpe: 0,
      maxDrawdown: 0,
      expectancy: 0,
      avgHoldHours: 0,
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0
    }
  }

  const tradesWithPnL = trades.filter(t => t.pnl !== undefined && t.pnl !== null)
  const totalTrades = tradesWithPnL.length
  
  if (totalTrades === 0) {
    return {
      winRate: 0,
      sharpe: 0,
      maxDrawdown: 0,
      expectancy: 0,
      avgHoldHours: 0,
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0
    }
  }

  // Basic statistics
  const winningTrades = tradesWithPnL.filter(t => t.pnl! > 0).length
  const losingTrades = tradesWithPnL.filter(t => t.pnl! < 0).length
  const winRate = totalTrades > 0 ? winningTrades / totalTrades * 100 : 0

  // PnL calculations
  const totalPnL = tradesWithPnL.reduce((sum, t) => sum + t.pnl!, 0)
  const avgWin = winningTrades > 0 
    ? tradesWithPnL.filter(t => t.pnl! > 0).reduce((sum, t) => sum + t.pnl!, 0) / winningTrades 
    : 0
  const avgLoss = losingTrades > 0 
    ? Math.abs(tradesWithPnL.filter(t => t.pnl! < 0).reduce((sum, t) => sum + t.pnl!, 0)) / losingTrades 
    : 0
  const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0

  // Sharpe ratio
  const returns = tradesWithPnL.map(t => t.pnl!)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
  const sharpe = returnStd > 0 ? avgReturn / returnStd : 0

  // Max drawdown
  let peak = 0
  let maxDrawdown = 0
  let runningPnL = 0
  
  for (const trade of tradesWithPnL) {
    runningPnL += trade.pnl!
    if (runningPnL > peak) {
      peak = runningPnL
    }
    const drawdown = (peak - runningPnL) / Math.max(peak, 1)
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return {
    winRate: Math.round(winRate * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    avgHoldHours: 24,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalTrades,
    winningTrades,
    losingTrades,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const trades: Trade[] = body.trades

    if (!trades || !Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ error: 'trades array required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const kpis = calculateKPIs(trades)

    return new Response(JSON.stringify(kpis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('KPI calculation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to calculate KPIs' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
