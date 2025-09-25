import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

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
  pnl?: number
}

function calculateKPIs(trades: Trade[]) {
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
      losingTrades: 0
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
      losingTrades: 0
    }
  }

  // Basic statistics
  const winningTrades = tradesWithPnL.filter(t => t.pnl! > 0).length
  const losingTrades = tradesWithPnL.filter(t => t.pnl! < 0).length
  const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

  // PnL calculations
  const totalPnL = tradesWithPnL.reduce((sum, t) => sum + t.pnl!, 0)
  const avgWin = winningTrades > 0 ? tradesWithPnL.filter(t => t.pnl! > 0).reduce((sum, t) => sum + t.pnl!, 0) / winningTrades : 0
  const avgLoss = losingTrades > 0 ? Math.abs(tradesWithPnL.filter(t => t.pnl! < 0).reduce((sum, t) => sum + t.pnl!, 0)) / losingTrades : 0
  const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0

  // Sharpe ratio approximation (using daily returns)
  const returns = tradesWithPnL.map(t => t.pnl!)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
  const sharpe = returnStd > 0 ? avgReturn / returnStd : 0

  // Max drawdown calculation (simplified)
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

  // Average hold time (hours)
  const avgHoldHours = 24 // Simplified - would need entry/exit times for accurate calculation

  return {
    winRate: Math.round(winRate * 10000) / 100, // Percentage with 2 decimal places
    sharpe: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    avgHoldHours,
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user
    if (!user) throw new Error('Unauthorized')

    const { trades, workspace_id } = await req.json()
    if (!trades) throw new Error('trades array required')

    // Log telemetry
    if (workspace_id) {
      await supabaseClient.from('analyst_telemetry').insert({
        workspace_id,
        user_id: user.id,
        event: 'tool_call',
        payload: { tool: 'calc_kpis', trade_count: trades.length }
      })
    }

    const kpis = calculateKPIs(trades)

    return new Response(JSON.stringify(kpis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // TypeScript error handling fix
    console.error('KPI calculation error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to calculate KPIs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})