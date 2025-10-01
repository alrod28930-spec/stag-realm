// Health check endpoint for system status
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { searchParams } = new URL(req.url);
    const ws = searchParams.get('ws');

    const res: any = { 
      status: 'ok', 
      last_sync: null, 
      candles: {}, 
      errors_24h: 0 
    };

    // Get last sync heartbeat
    const { data: hb } = await supabase
      .from('recorder_mirror')
      .select('ts, payload')
      .eq('actor', 'oracle')
      .eq('event_type', 'sync.heartbeat')
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    res.last_sync = hb?.ts ?? null;

    // Get candle summary for workspace
    if (ws) {
      const { data: rows } = await supabase
        .from('candles')
        .select('symbol, tf, ts')
        .eq('workspace_id', ws)
        .order('ts', { ascending: false })
        .limit(100);
        
      for (const r of (rows ?? [])) {
        const key = `${r.symbol}:${r.tf}`;
        if (!res.candles[key]) {
          res.candles[key] = r.ts;
        }
      }
    }

    // Count errors in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('recorder_mirror')
      .select('*', { count: 'exact', head: true })
      .gte('ts', since)
      .in('event_type', ['sync.error', 'order.error']);
      
    res.errors_24h = count ?? 0;
    res.status = res.errors_24h > 10 ? 'degraded' : 'ok';

    return new Response(
      JSON.stringify(res), 
      { headers: { ...corsHeaders, 'content-type': 'application/json' } }
    );
    
  } catch (e: any) {
    return new Response(
      JSON.stringify({ status: 'error', error: e.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' } 
      }
    );
  }
});
