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

    const { symbols = [], horizon = 'swing', workspace_id } = await req.json()
    if (!workspace_id) throw new Error('workspace_id required')

    // Check Oracle entitlements
    const { data: hasBasic } = await supabaseClient.rpc('has_entitlement', {
      p_workspace: workspace_id,
      p_feature: 'ORACLE_BASIC'
    })

    const { data: hasExpanded } = await supabaseClient.rpc('has_entitlement', {
      p_workspace: workspace_id,
      p_feature: 'ORACLE_EXPANDED'
    })

    if (!hasBasic) {
      return new Response(JSON.stringify({ 
        signals: [],
        error: 'LOCKED_FEATURE',
        feature: 'ORACLE_BASIC',
        required_tier: 'standard'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log telemetry
    await supabaseClient.from('analyst_telemetry').insert({
      workspace_id,
      user_id: user.id,
      event: 'tool_call',
      payload: { tool: 'oracle_signals', symbols, horizon, has_expanded: hasExpanded }
    })

    // Build query for oracle signals
    let query = supabaseClient
      .from('oracle_signals')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('ts', { ascending: false })

    // Filter by symbols if provided
    if (symbols.length > 0) {
      query = query.in('symbol', symbols)
    }

    // Filter by horizon/timeframe
    const timeframeFilters: { [key: string]: string[] } = {
      'intraday': ['volatility_spike', 'volume_surge', 'technical_breakout'],
      'swing': ['sector_rotation', 'earnings_beat', 'news_sentiment'],
      'macro': ['macro_shift', 'sector_rotation']
    }

    if (timeframeFilters[horizon]) {
      query = query.in('signal_type', timeframeFilters[horizon])
    }

    // Limit based on entitlement level
    const limit = hasExpanded ? 20 : 5
    query = query.limit(limit)

    const { data: signals } = await query

    // Transform signals into structured format
    const transformedSignals = signals?.map(signal => ({
      id: signal.id,
      type: signal.signal_type,
      symbol: signal.symbol,
      direction: signal.direction > 0 ? 'bullish' : signal.direction < 0 ? 'bearish' : 'neutral',
      confidence: signal.strength,
      severity: signal.strength > 0.8 ? 'high' : signal.strength > 0.5 ? 'medium' : 'low',
      signal: signal.summary || 'Market signal detected',
      description: signal.summary || 'Oracle signal analysis',
      timestamp: signal.ts,
      source: signal.source || 'Oracle',
      restricted: !hasExpanded && ['earnings_beat', 'macro_shift'].includes(signal.signal_type)
    })) || []

    // Filter out restricted signals for basic tier
    const filteredSignals = transformedSignals.filter(s => !s.restricted)

    const response = {
      signals: filteredSignals,
      count: filteredSignals.length,
      horizon,
      symbols: symbols.length > 0 ? symbols : null,
      entitlement_level: hasExpanded ? 'expanded' : 'basic',
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Oracle signals error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get Oracle signals' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})