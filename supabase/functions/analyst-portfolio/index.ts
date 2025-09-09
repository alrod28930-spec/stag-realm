import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { workspace_id } = await req.json()
    if (!workspace_id) throw new Error('workspace_id required')

    // Log telemetry
    await supabaseClient.from('analyst_telemetry').insert({
      workspace_id,
      user_id: user.id,
      event: 'tool_call',
      payload: { tool: 'get_portfolio_snapshot', workspace_id }
    })

    // Get current portfolio data
    const { data: portfolio } = await supabaseClient
      .from('portfolio_current')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single()

    // Get positions
    const { data: positions } = await supabaseClient
      .from('positions_current')
      .select('*')
      .eq('workspace_id', workspace_id)

    // Get recent risk metrics
    const { data: riskMetrics } = await supabaseClient
      .from('risk_portfolio')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('ts', { ascending: false })
      .limit(1)
      .single()

    // Calculate allocations by symbol and sector
    const totalEquity = portfolio?.equity || 0
    const allocations = positions?.map(pos => ({
      symbol: pos.symbol,
      marketValue: pos.mv,
      allocation: totalEquity > 0 ? (pos.mv / totalEquity) * 100 : 0,
      unrealizedPnL: pos.unr_pnl,
      realizedPnL: pos.r_pnl
    })) || []

    const response = {
      portfolio: {
        cash: portfolio?.cash || 0,
        equity: portfolio?.equity || 0,
        totalValue: (portfolio?.cash || 0) + (portfolio?.equity || 0)
      },
      positions: allocations,
      risk: riskMetrics ? {
        beta: riskMetrics.beta,
        var95: riskMetrics.var_95,
        expectedShortfall: riskMetrics.es_95,
        drawdown: riskMetrics.dd_pct,
        concentration: riskMetrics.concentration_top,
        liquidityScore: riskMetrics.liquidity_score,
        riskState: riskMetrics.risk_state
      } : null,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Portfolio snapshot error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get portfolio snapshot' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})