import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RiskSettings {
  daily_drawdown_halt_pct: number
  per_trade_risk_pct: number
  leverage_cap: number
  sector_exposure_cap_pct: number
  exposure_limits_enabled: boolean
  hard_pull_enabled: boolean
  soft_pull_enabled: boolean
}

interface PortfolioSnapshot {
  portfolio: {
    cash: number
    equity: number
    totalValue: number
  }
  positions: Array<{
    symbol: string
    marketValue: number
    allocation: number
    unrealizedPnL: number
  }>
  risk?: {
    drawdown?: number
    var95?: number
    riskState?: number
  }
}

function evaluateRisk(snapshot: PortfolioSnapshot, settings: RiskSettings) {
  const reasons: string[] = []
  let level: 'low' | 'medium' | 'high' = 'low'
  let halted = false

  const totalValue = snapshot.portfolio.totalValue || 1
  const currentDrawdown = Math.abs(snapshot.risk?.drawdown || 0)

  // Check daily drawdown halt
  if (currentDrawdown > settings.daily_drawdown_halt_pct) {
    halted = true
    level = 'high'
    reasons.push(`Daily drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds halt limit ${(settings.daily_drawdown_halt_pct * 100).toFixed(1)}%`)
  }

  // Check sector concentration
  const sectorConcentration = snapshot.positions.reduce((max, pos) => {
    return Math.max(max, Math.abs(pos.allocation))
  }, 0)

  if (sectorConcentration > settings.sector_exposure_cap_pct * 100) {
    if (level !== 'high') level = 'medium'
    reasons.push(`Position concentration ${sectorConcentration.toFixed(1)}% exceeds limit ${(settings.sector_exposure_cap_pct * 100).toFixed(1)}%`)
  }

  // Check leverage (simplified - based on total position value vs cash)
  const totalPositionValue = snapshot.positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
  const leverageRatio = totalValue > 0 ? totalPositionValue / totalValue : 0

  if (leverageRatio > settings.leverage_cap) {
    if (level === 'low') level = 'medium'
    reasons.push(`Leverage ratio ${leverageRatio.toFixed(2)}x exceeds cap ${settings.leverage_cap}x`)
  }

  // Check VAR if available
  if (snapshot.risk?.var95 && snapshot.risk.var95 > 0.05) { // 5% VAR threshold
    if (level === 'low') level = 'medium'
    reasons.push(`Value at Risk ${(snapshot.risk.var95 * 100).toFixed(1)}% is elevated`)
  }

  // Check risk state from system
  if (snapshot.risk?.riskState && snapshot.risk.riskState >= 3) {
    if (level !== 'high') level = 'medium'
    reasons.push('System risk state indicates elevated market risk')
  }

  return {
    halted,
    level,
    reasons,
    metrics: {
      currentDrawdown: currentDrawdown * 100,
      leverageRatio,
      sectorConcentration,
      var95: (snapshot.risk?.var95 || 0) * 100,
      riskState: snapshot.risk?.riskState || 0
    }
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

    const { snapshot, workspace_id } = await req.json()
    if (!snapshot || !workspace_id) {
      throw new Error('snapshot and workspace_id required')
    }

    // Log telemetry
    await supabaseClient.from('analyst_telemetry').insert({
      workspace_id,
      user_id: user.id,
      event: 'tool_call',
      payload: { tool: 'risk_eval', workspace_id }
    })

    // Get risk settings
    const { data: riskSettings } = await supabaseClient
      .from('risk_settings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single()

    if (!riskSettings) {
      throw new Error('Risk settings not found for workspace')
    }

    const evaluation = evaluateRisk(snapshot, riskSettings)

    // Log risk evaluation event
    await supabaseClient.from('rec_events').insert({
      workspace_id,
      user_id: user.id,
      event_type: 'risk.evaluation',
      severity: evaluation.level === 'high' ? 3 : evaluation.level === 'medium' ? 2 : 1,
      entity_type: 'portfolio',
      entity_id: workspace_id,
      summary: `Risk evaluation: ${evaluation.level} (${evaluation.reasons.length} concerns)`,
      payload_json: {
        ...evaluation,
        timestamp: new Date().toISOString()
      }
    })

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Risk evaluation error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to evaluate risk' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})