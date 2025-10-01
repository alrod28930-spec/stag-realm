import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Get last sync heartbeat
    const { data: lastSync } = await supabase
      .from('rec_events')
      .select('ts, payload_json')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'sync.heartbeat')
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get recent errors (last 15 min)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentErrors, count: errorCount } = await supabase
      .from('rec_events')
      .select('*', { count: 'exact', head: false })
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'sync.error')
      .gte('ts', fifteenMinAgo);

    // Get last bars per (symbol, tf) to check staleness
    const { data: lastBars } = await supabase
      .from('candles')
      .select('symbol, tf, ts')
      .eq('workspace_id', workspaceId)
      .order('ts', { ascending: false })
      .limit(20);

    // Group by symbol:tf
    const lastBarMap: Record<string, string> = {};
    lastBars?.forEach(bar => {
      const key = `${bar.symbol}:${bar.tf}`;
      if (!lastBarMap[key] || bar.ts > lastBarMap[key]) {
        lastBarMap[key] = bar.ts;
      }
    });

    // Determine staleness
    const now = Date.now();
    const staleThresholds: Record<string, number> = {
      '1m': 5 * 60 * 1000, // 5 min
      '5m': 15 * 60 * 1000, // 15 min
      '1h': 90 * 60 * 1000, // 90 min
      '1D': 25 * 60 * 60 * 1000, // 25 hours
    };

    const staleSymbols: string[] = [];
    Object.entries(lastBarMap).forEach(([key, tsStr]) => {
      const [symbol, tf] = key.split(':');
      const threshold = staleThresholds[tf] || 60 * 60 * 1000;
      const elapsed = now - new Date(tsStr).getTime();
      if (elapsed > threshold) {
        staleSymbols.push(key);
      }
    });

    // Overall status
    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (!lastSync || errorCount && errorCount > 3) {
      status = 'down';
    } else if (staleSymbols.length > 0 || (errorCount && errorCount > 0)) {
      status = 'degraded';
    }

    return new Response(
      JSON.stringify({
        status,
        last_sync: lastSync?.ts || null,
        last_bars: lastBarMap,
        stale_symbols: staleSymbols,
        error_count_15m: errorCount || 0,
        recent_errors: recentErrors?.slice(0, 3).map(e => ({
          ts: e.ts,
          summary: e.summary,
        })) || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Health check failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
