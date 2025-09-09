import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function simulateOrder(symbol: string, side: string, size: number, currentPrice?: number) {
  // Mock simulation - in real implementation would use market data
  const basePrice = currentPrice || 100 // Default price if not provided
  
  // Estimate slippage based on order size (simplified model)
  const sizeCategory = size < 100 ? 'small' : size < 1000 ? 'medium' : 'large'
  const slippageBps = {
    'small': 2,    // 2 basis points
    'medium': 5,   // 5 basis points  
    'large': 12    // 12 basis points
  }[sizeCategory]

  const slippage = basePrice * (slippageBps / 10000)
  const estimatedPrice = side === 'buy' ? basePrice + slippage : basePrice - slippage
  
  // Estimate fees (simplified)
  const feeRate = 0.001 // 0.1%
  const fees = Math.abs(size * estimatedPrice * feeRate)
  
  // Fill probability based on market conditions
  const fillProbability = {
    'small': 0.95,
    'medium': 0.88,
    'large': 0.75
  }[sizeCategory]

  // Market impact estimate
  const marketImpact = slippage / basePrice * 100 // As percentage

  return {
    symbol,
    side,
    size,
    estimatedPrice: Math.round(estimatedPrice * 100) / 100,
    slippage: Math.round(slippage * 100) / 100,
    slippageBps,
    fees: Math.round(fees * 100) / 100,
    fillProbability,
    marketImpact: Math.round(marketImpact * 10000) / 100, // Basis points
    totalCost: Math.round((Math.abs(size * estimatedPrice) + fees) * 100) / 100,
    note: `${sizeCategory.charAt(0).toUpperCase() + sizeCategory.slice(1)} order simulation`,
    timestamp: new Date().toISOString()
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

    const { symbol, side, size, workspace_id, current_price } = await req.json()
    
    if (!symbol || !side || !size) {
      throw new Error('symbol, side, and size are required')
    }

    if (!['buy', 'sell'].includes(side.toLowerCase())) {
      throw new Error('side must be "buy" or "sell"')
    }

    if (size <= 0) {
      throw new Error('size must be positive')
    }

    // Log telemetry
    if (workspace_id) {
      await supabaseClient.from('analyst_telemetry').insert({
        workspace_id,
        user_id: user.id,
        event: 'tool_call',
        payload: { tool: 'simulate_order', symbol, side, size }
      })
    }

    // Get current market data if available
    let marketPrice = current_price
    if (!marketPrice && workspace_id) {
      // Try to get recent price from candles table
      const { data: recentCandle } = await supabaseClient
        .from('candles')
        .select('c')
        .eq('workspace_id', workspace_id)
        .eq('symbol', symbol.toUpperCase())
        .eq('tf', '1m')
        .order('ts', { ascending: false })
        .limit(1)
        .single()

      if (recentCandle) {
        marketPrice = parseFloat(recentCandle.c)
      }
    }

    const simulation = simulateOrder(symbol.toUpperCase(), side.toLowerCase(), size, marketPrice)

    // Add risk warnings based on simulation
    const warnings: string[] = []
    
    if (simulation.marketImpact > 50) { // > 50 bps
      warnings.push('High market impact expected - consider splitting order')
    }
    
    if (simulation.fillProbability < 0.8) {
      warnings.push('Lower fill probability - market conditions may be challenging')
    }
    
    if (simulation.slippageBps > 10) {
      warnings.push('Significant slippage expected - consider limit order')
    }

    const response = {
      ...simulation,
      warnings,
      disclaimer: 'Simulation only - actual execution may vary based on market conditions'
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Order simulation error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to simulate order' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})