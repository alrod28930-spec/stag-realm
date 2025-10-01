import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
}

interface AlpacaQuote {
  ap: number;
  bp: number;
}

// Circuit breaker state per workspace
const circuitBreakers = new Map<string, { failures: number; lastFailure: Date; isOpen: boolean }>();

function getCircuitBreaker(key: string) {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, { failures: 0, lastFailure: new Date(0), isOpen: false });
  }
  return circuitBreakers.get(key)!;
}

function recordSuccess(key: string) {
  const cb = getCircuitBreaker(key);
  cb.failures = 0;
  cb.isOpen = false;
}

function recordFailure(key: string) {
  const cb = getCircuitBreaker(key);
  cb.failures++;
  cb.lastFailure = new Date();
  if (cb.failures >= 3) {
    cb.isOpen = true;
    console.warn(`🔴 Circuit breaker OPEN for ${key} (${cb.failures} failures)`);
  }
}

function isCircuitOpen(key: string): boolean {
  const cb = getCircuitBreaker(key);
  if (!cb.isOpen) return false;
  
  // Auto-reset after 5 minutes
  const elapsed = Date.now() - cb.lastFailure.getTime();
  if (elapsed > 5 * 60 * 1000) {
    console.log(`🟢 Circuit breaker RESET for ${key}`);
    cb.isOpen = false;
    cb.failures = 0;
    return false;
  }
  return true;
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 200
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed after ${maxRetries} attempts:`, error);
        return null;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100; // jitter
      console.log(`⏳ Retry ${attempt}/${maxRetries} after ${delay.toFixed(0)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting Oracle market data sync...');

    // Get active brokerage connections
    const { data: connections, error: connError } = await supabase
      .from('connections_brokerages')
      .select('id, workspace_id, provider, status')
      .eq('provider', 'alpaca')
      .eq('status', 'active');

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      console.log('⚠️ No active Alpaca connections');
      return new Response(JSON.stringify({ message: 'No active connections' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`✅ Found ${connections.length} active workspace(s)`);

    // Get whitelisted symbols from ref_symbols
    const { data: refSymbols, error: symbolsError } = await supabase
      .from('ref_symbols')
      .select('symbol')
      .eq('active', true);

    if (symbolsError) throw symbolsError;
    const whitelist = new Set(refSymbols?.map(s => s.symbol) || []);
    console.log(`📋 Symbol whitelist: ${whitelist.size} active symbols`);

    const timeframes = [
      { alpaca: '1Day', db: '1D', days: 100 },
      { alpaca: '1Hour', db: '1h', days: 30 },
      { alpaca: '5Min', db: '5m', days: 5 },
    ];

    let totalBarsInserted = 0;
    const healthReport: any[] = [];

    // Process each workspace
    for (const conn of connections) {
      const wsKey = `ws:${conn.workspace_id}`;
      if (isCircuitOpen(wsKey)) {
        console.log(`⏭️ Skipping ${conn.workspace_id} (circuit breaker open)`);
        continue;
      }

      try {
        console.log(`\n📊 Processing workspace: ${conn.workspace_id}`);

        // Get credentials (encrypted first, env fallback)
        let apiKey: string | undefined;
        let apiSecret: string | undefined;

        try {
          const { data: credData, error: credError } = await supabase.functions.invoke(
            'decrypt-brokerage-credentials',
            { body: { connectionId: conn.id } }
          );

          if (!credError && credData?.success && credData?.credentials) {
            apiKey = credData.credentials.api_key || credData.credentials.apiKey;
            apiSecret = credData.credentials.secret_key || credData.credentials.apiSecret;
            console.log(`🔑 Using encrypted credentials`);
          } else {
            throw new Error('Decrypt returned no credentials');
          }
        } catch (decryptErr) {
          console.warn(`⚠️ Decrypt failed, trying env fallback`);
          apiKey = Deno.env.get('ALPACA_API_KEY');
          apiSecret = Deno.env.get('ALPACA_SECRET_KEY');
          if (apiKey && apiSecret) {
            console.log(`🔑 Using environment fallback credentials`);
          }
        }

        if (!apiKey || !apiSecret) {
          console.error(`❌ No valid credentials for workspace ${conn.workspace_id}`);
          recordFailure(wsKey);
          continue;
        }

        // Get position symbols + filter by whitelist
        const { data: positions } = await supabase
          .from('positions_current')
          .select('symbol')
          .eq('workspace_id', conn.workspace_id);

        const posSymbols = positions?.map(p => p.symbol).filter(s => whitelist.has(s)) || [];
        const allSymbols = [...new Set([...posSymbols, ...Array.from(whitelist).slice(0, 12)])];

        console.log(`📈 Fetching data for ${allSymbols.length} symbols (${posSymbols.length} positions + market indices)`);

        const dataUrl = 'https://data.alpaca.markets';
        const endDate = new Date();
        let barsInserted = 0;
        const lastBarPerSymbol = new Map<string, { tf: string; ts: string }>();

        // Fetch bars per symbol
        for (const symbol of allSymbols) {
          if (!whitelist.has(symbol)) {
            console.log(`⏭️ Skipping ${symbol} (not in whitelist)`);
            continue;
          }

          try {
            for (const tf of timeframes) {
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - tf.days);

              const barsUrl = `${dataUrl}/v2/stocks/${symbol}/bars?` +
                `start=${startDate.toISOString().split('T')[0]}&` +
                `end=${endDate.toISOString().split('T')[0]}&` +
                `timeframe=${tf.alpaca}&limit=1000`;

              const bars = await fetchWithRetry<AlpacaBar[]>(async () => {
                const resp = await fetch(barsUrl, {
                  headers: {
                    'APCA-API-KEY-ID': apiKey!,
                    'APCA-API-SECRET-KEY': apiSecret!,
                  }
                });

                if (!resp.ok) {
                  const errText = await resp.text();
                  throw new Error(`${resp.status}: ${errText}`);
                }

                const data = await resp.json();
                return data.bars || [];
              });

              if (!bars || bars.length === 0) {
                console.log(`⚠️ No ${tf.db} bars for ${symbol}`);
                continue;
              }

              // Upsert candles
              const candleRecords = bars.map(bar => ({
                workspace_id: conn.workspace_id,
                symbol,
                tf: tf.db,
                ts: bar.t,
                o: bar.o,
                h: bar.h,
                l: bar.l,
                c: bar.c,
                v: bar.v,
                vwap: bar.vw || null
              }));

              const { error: insertError } = await supabase
                .from('candles')
                .upsert(candleRecords, {
                  onConflict: 'workspace_id,symbol,tf,ts',
                  ignoreDuplicates: false
                });

              if (insertError) {
                console.error(`❌ Insert error (${symbol}, ${tf.db}):`, insertError.message);
              } else {
                barsInserted += bars.length;
                const lastBar = bars[bars.length - 1];
                lastBarPerSymbol.set(`${symbol}:${tf.db}`, { tf: tf.db, ts: lastBar.t });
                console.log(`✅ ${bars.length} ${tf.db} bars for ${symbol}`);
              }

              // Rate limit between timeframes
              await new Promise(resolve => setTimeout(resolve, 150));
            }

            // Rate limit between symbols
            await new Promise(resolve => setTimeout(resolve, 250));

          } catch (symbolError) {
            console.error(`❌ Error processing ${symbol}:`, symbolError);
          }
        }

        totalBarsInserted += barsInserted;
        recordSuccess(wsKey);

        // Emit heartbeat event
        await supabase.rpc('recorder_log', {
          p_workspace: conn.workspace_id,
          p_event_type: 'sync.heartbeat',
          p_severity: 1,
          p_entity_type: 'oracle',
          p_entity_id: 'market-data-sync',
          p_summary: `Synced ${barsInserted} bars for ${allSymbols.length} symbols`,
          p_payload: {
            bars_inserted: barsInserted,
            symbols_processed: allSymbols.length,
            last_bars: Object.fromEntries(lastBarPerSymbol),
          }
        });

        healthReport.push({
          workspace_id: conn.workspace_id,
          status: barsInserted > 0 ? 'ok' : 'degraded',
          bars_inserted: barsInserted,
          symbols: allSymbols.length,
        });

        // Watchdog: if 0 bars for this workspace → emit warning
        if (barsInserted === 0) {
          console.warn(`⚠️ WATCHDOG: 0 bars inserted for workspace ${conn.workspace_id}`);
          await supabase.rpc('recorder_log', {
            p_workspace: conn.workspace_id,
            p_event_type: 'sync.warn',
            p_severity: 2,
            p_entity_type: 'oracle',
            p_entity_id: 'market-data-sync',
            p_summary: 'No bars fetched',
            p_payload: {
              reason: 'API returned 0 bars',
              symbols_attempted: allSymbols,
            }
          });
        }

      } catch (workspaceError) {
        console.error(`❌ Workspace ${conn.workspace_id} error:`, workspaceError);
        recordFailure(wsKey);

        await supabase.rpc('recorder_log', {
          p_workspace: conn.workspace_id,
          p_event_type: 'sync.error',
          p_severity: 3,
          p_entity_type: 'oracle',
          p_entity_id: 'market-data-sync',
          p_summary: 'Sync failed',
          p_payload: {
            error: workspaceError instanceof Error ? workspaceError.message : 'Unknown error'
          }
        });

        healthReport.push({
          workspace_id: conn.workspace_id,
          status: 'down',
          error: workspaceError instanceof Error ? workspaceError.message : 'Unknown',
        });
      }
    }

    console.log(`\n✅ Oracle sync complete: ${totalBarsInserted} bars across ${connections.length} workspace(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        workspaces: connections.length,
        bars_inserted: totalBarsInserted,
        health: healthReport,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Oracle sync error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Oracle sync failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
