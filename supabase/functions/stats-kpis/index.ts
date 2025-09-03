import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KPIStats {
  winRate: number;
  totalReturn: number;
  totalTrades: number;
  tradesLast30d: number;
  sharpeRatio?: number;
  todayTrades: number;
  avgPerformance7d: number;
  avgHoldTime: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Handle test accounts - check if it's an anon key (test scenario)
    const isTestRequest = token === Deno.env.get('SUPABASE_ANON_KEY');
    let user: any = null;
    
    if (isTestRequest) {
      // For test requests, create a mock user
      user = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'john.trader@stagalgo.com'
      };
    } else {
      // Verify the JWT and get user for real requests
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !authUser) {
        throw new Error('Unauthorized');
      }
      user = authUser;
    }

    const workspaceId = isTestRequest ? '00000000-0000-0000-0000-000000000001' : (user.user_metadata?.workspace_id || user.id);

    // Get trade events for the workspace
    const { data: tradeEvents, error: eventsError } = await supabaseClient
      .from('rec_events')
      .select('ts, event_type, payload_json')
      .eq('workspace_id', workspaceId)
      .in('event_type', ['trade.closed', 'trade.manual.executed'])
      .order('ts', { ascending: false });

    if (eventsError) throw eventsError;

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter events by type and date
    const closedTrades = tradeEvents.filter(e => e.event_type === 'trade.closed');
    const todayTrades = tradeEvents.filter(e => new Date(e.ts) >= today);
    const tradesLast30d = tradeEvents.filter(e => new Date(e.ts) >= last30Days);
    const tradesLast7d = closedTrades.filter(e => new Date(e.ts) >= last7Days);

    // Calculate win/loss statistics
    const wins = closedTrades.filter(e => {
      const payload = e.payload_json as any;
      return (payload?.pnl || 0) > 0;
    }).length;

    const losses = closedTrades.filter(e => {
      const payload = e.payload_json as any;
      return (payload?.pnl || 0) < 0;
    }).length;

    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Calculate total return (sum of all PnL)
    const totalPnl = closedTrades.reduce((sum, trade) => {
      const payload = trade.payload_json as any;
      return sum + (payload?.pnl || 0);
    }, 0);

    // Calculate 7-day average performance
    const avg7dPnl = tradesLast7d.reduce((sum, trade) => {
      const payload = trade.payload_json as any;
      return sum + (payload?.pnl || 0);
    }, 0);
    const avgPerformance7d = tradesLast7d.length > 0 ? avg7dPnl / tradesLast7d.length : 0;

    // Calculate average hold time
    const holdTimes = closedTrades
      .map(trade => {
        const payload = trade.payload_json as any;
        return payload?.hold_minutes;
      })
      .filter(time => time !== undefined && time > 0);

    let avgHoldTime: string | null = null;
    if (holdTimes.length > 0) {
      const avgMinutes = holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length;
      const hours = Math.floor(avgMinutes / 60);
      const minutes = Math.floor(avgMinutes % 60);
      avgHoldTime = `${hours}h ${minutes}m`;
    }

    // Calculate Sharpe ratio (simplified version)
    let sharpeRatio: number | undefined = undefined;
    if (closedTrades.length >= 10) {
      const returns = closedTrades.map(trade => {
        const payload = trade.payload_json as any;
        return payload?.return_pct || 0;
      }).filter(ret => ret !== 0);

      if (returns.length >= 5) {
        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
      }
    }

    const stats: KPIStats = {
      winRate: Math.round(winRate * 100) / 100,
      totalReturn: Math.round(totalPnl * 100) / 100,
      totalTrades: closedTrades.length,
      tradesLast30d: tradesLast30d.length,
      sharpeRatio: sharpeRatio ? Math.round(sharpeRatio * 100) / 100 : undefined,
      todayTrades: todayTrades.length,
      avgPerformance7d: Math.round(avgPerformance7d * 100) / 100,
      avgHoldTime
    };

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Stats KPI error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch trading statistics'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})