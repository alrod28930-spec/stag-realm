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

    const { workspace_id, since, limit = 20 } = await req.json()
    if (!workspace_id) throw new Error('workspace_id required')

    // Log telemetry
    await supabaseClient.from('analyst_telemetry').insert({
      workspace_id,
      user_id: user.id,
      event: 'tool_call',
      payload: { tool: 'get_recent_trades', workspace_id, since, limit }
    })

    // Get recent events (trades) from recorder
    let query = supabaseClient
      .from('rec_events')
      .select('*')
      .eq('workspace_id', workspace_id)
      .in('event_type', ['trade.executed', 'order.filled', 'position.opened', 'position.closed'])
      .order('ts', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('ts', since)
    }

    const { data: events } = await query

    // Transform events into trade format
    const trades = events?.map(event => {
      const payload = event.payload_json || {}
      return {
        id: event.id,
        timestamp: event.ts,
        symbol: payload.symbol || 'UNKNOWN',
        side: payload.side || payload.action,
        quantity: payload.quantity || payload.qty || payload.size,
        price: payload.price || payload.fill_price,
        fees: payload.fees || payload.commission || 0,
        type: event.event_type,
        summary: event.summary,
        pnl: payload.pnl || payload.realized_pnl
      }
    }) || []

    const response = {
      trades,
      count: trades.length,
      since: since || null,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Recent trades error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get recent trades' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})