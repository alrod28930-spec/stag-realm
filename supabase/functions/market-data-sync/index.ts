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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting market data sync...');

    // Get all active brokerage connections with Alpaca credentials
    const { data: connections, error: connError } = await supabase
      .from('connections_brokerages')
      .select('id, workspace_id, provider, status')
      .eq('provider', 'alpaca')
      .eq('status', 'active');

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      console.log('⚠️ No active Alpaca connections found');
      return new Response(JSON.stringify({ message: 'No active connections' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`✅ Found ${connections.length} active connections`);

    // Market indices to always track
    const marketIndices = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'AGG'];

    let totalBarsInserted = 0;
    let totalQuotesInserted = 0;

    // Process each workspace
    for (const conn of connections) {
      try {
        console.log(`📊 Processing workspace: ${conn.workspace_id}`);

        // Get stored credentials via decrypt-brokerage-credentials (mirror alpaca-sync pattern)
        let apiKey: string | undefined;
        let apiSecret: string | undefined;

        try {
          const { data: credentialsData, error: credError } = await supabase.functions.invoke(
            'decrypt-brokerage-credentials',
            {
              body: { connectionId: conn.id }
            }
          );

          if (!credError && credentialsData?.success && credentialsData?.credentials) {
            apiKey = credentialsData.credentials.api_key || credentialsData.credentials.apiKey;
            apiSecret = credentialsData.credentials.secret_key || credentialsData.credentials.apiSecret;
            console.log(`✅ Successfully decrypted credentials for workspace ${conn.workspace_id}`);
          } else {
            throw new Error('Decrypt returned no credentials');
          }
        } catch (decryptErr) {
          console.error(`Decrypt failed for workspace ${conn.workspace_id}, trying env fallback:`, decryptErr);
          // Fallback to environment variables
          apiKey = Deno.env.get('ALPACA_API_KEY');
          apiSecret = Deno.env.get('ALPACA_SECRET_KEY');
          if (apiKey && apiSecret) {
            console.log('Using Alpaca credentials from environment fallback');
          }
        }

        if (!apiKey || !apiSecret) {
          console.error(`❌ No valid credentials found for workspace ${conn.workspace_id}`);
          continue;
        }

        // Use Alpaca's dedicated data API endpoint (same for paper and live accounts)
        const dataUrl = 'https://data.alpaca.markets';
        console.log(`🔑 Market data sync using data API: ${dataUrl}`);

        // Get positions to fetch bars for held symbols
        const { data: positions } = await supabase
          .from('positions_current')
          .select('symbol')
          .eq('workspace_id', conn.workspace_id);

        const positionSymbols = positions?.map(p => p.symbol) || [];
        const allSymbols = [...new Set([...positionSymbols, ...marketIndices])];

        // Fallback: If no symbols, use a default watchlist
        if (allSymbols.length === 0) {
          console.log('⚠️ No positions or indices found, using default watchlist');
          allSymbols.push('AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META');
        }

        console.log(`📈 Fetching data for ${allSymbols.length} symbols...`);

        // Fetch multiple timeframes: 1Min, 5Min, 15Min, 1Hour, 1Day
        const timeframes = [
          { alpaca: '1Min', db: '1m', days: 1 },     // Last 1 day of 1min bars (390 bars)
          { alpaca: '5Min', db: '5m', days: 5 },     // Last 5 days of 5min bars
          { alpaca: '15Min', db: '15m', days: 10 },  // Last 10 days of 15min bars
          { alpaca: '1Hour', db: '1h', days: 30 },   // Last 30 days of 1hour bars
          { alpaca: '1Day', db: '1D', days: 100 }    // Last 100 days of daily bars
        ];

        const endDate = new Date();

        for (const symbol of allSymbols) {
          try {
            // Fetch all timeframes for this symbol
            for (const tf of timeframes) {
              try {
                const tfStartDate = new Date();
                tfStartDate.setDate(tfStartDate.getDate() - tf.days);

                // Fetch bars from data API
                const barsUrl = `${dataUrl}/v2/stocks/${symbol}/bars?` +
                  `start=${tfStartDate.toISOString().split('T')[0]}&` +
                  `end=${endDate.toISOString().split('T')[0]}&` +
                  `timeframe=${tf.alpaca}&limit=1000`;

                const barsResponse = await fetch(barsUrl, {
                  headers: {
                    'APCA-API-KEY-ID': apiKey,
                    'APCA-API-SECRET-KEY': apiSecret,
                  }
                });

                if (!barsResponse.ok) {
                  const errorText = await barsResponse.text();
                  console.error(`Failed to fetch ${tf.db} bars for ${symbol}: ${barsResponse.status} - ${errorText}`);
                  continue;
                }

                const barsData = await barsResponse.json();
                const bars: AlpacaBar[] = barsData.bars || [];

                // Insert bars into candles table
                if (bars.length > 0) {
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
                    console.error(`Error inserting ${tf.db} candles for ${symbol}:`, insertError);
                  } else {
                    totalBarsInserted += bars.length;
                    console.log(`✅ Inserted ${bars.length} ${tf.db} bars for ${symbol}`);
                  }
                }

                // Rate limiting between timeframes
                await new Promise(resolve => setTimeout(resolve, 100));

              } catch (tfError) {
                console.error(`Error processing ${tf.db} for ${symbol}:`, tfError);
              }
            }

            // Fetch latest quote for market_data from data API (do this once per symbol, not per timeframe)
            const quoteUrl = `${dataUrl}/v2/stocks/${symbol}/quotes/latest`;
            const quoteResponse = await fetch(quoteUrl, {
              headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret,
              }
            });

            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              const quote = quoteData.quote as AlpacaQuote;

              if (quote) {
                // Get the last 1D bar for prev close calculation
                const last1DBar = await supabase
                  .from('candles')
                  .select('c')
                  .eq('workspace_id', conn.workspace_id)
                  .eq('symbol', symbol)
                  .eq('tf', '1D')
                  .order('ts', { ascending: false })
                  .limit(1)
                  .single();

                if (last1DBar.data) {
                  const currentPrice = (quote.ap + quote.bp) / 2;
                  const prevClose = last1DBar.data.c;
                  const change = currentPrice - prevClose;
                  const changePercent = (change / prevClose) * 100;

                  const { error: quoteError } = await supabase
                    .from('market_data')
                    .upsert({
                      workspace_id: conn.workspace_id,
                      symbol,
                      price: currentPrice,
                      change: change,
                      change_percent: changePercent,
                      volume: 0, // We'll get this from the latest 1D bar
                      high: 0,
                      low: 0,
                      open: 0,
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'workspace_id,symbol'
                    });

                  if (quoteError) {
                    console.error(`Error inserting quote for ${symbol}:`, quoteError);
                  } else {
                    totalQuotesInserted++;
                    console.log(`✅ Updated market data for ${symbol}`);
                  }
                }
              }
            }

            // Rate limiting - wait 200ms between symbols
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (symbolError) {
            console.error(`Error processing ${symbol}:`, symbolError);
          }
        }

      } catch (workspaceError) {
        console.error(`Error processing workspace ${conn.workspace_id}:`, workspaceError);
      }
    }

    console.log(`✅ Market data sync complete: ${totalBarsInserted} bars, ${totalQuotesInserted} quotes`);

    // Watchdog: Log if no bars were inserted
    if (totalBarsInserted === 0) {
      console.error('⚠️ WATCHDOG: Market data sync completed but 0 bars inserted. Possible issues:');
      console.error('  - API credentials may be invalid');
      console.error('  - Alpaca API may be rate-limited');
      console.error('  - No positions found and market indices may not be available');
      console.error('  - Network connectivity issues');
      
      // Log to recorder for UI visibility
      try {
        await supabase.rpc('recorder_log', {
          p_workspace: connections[0]?.workspace_id,
          p_event_type: 'market_data_sync_warning',
          p_severity: 2,
          p_entity_type: 'system',
          p_entity_id: 'market-data-sync',
          p_summary: 'Market data sync completed with 0 bars inserted',
          p_payload: {
            workspaces_processed: connections.length,
            symbols_attempted: allSymbols.length,
            message: 'No market data was fetched. Check API credentials and connectivity.'
          }
        });
      } catch (logError) {
        console.error('Failed to log watchdog event:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        workspaces: connections.length,
        bars_inserted: totalBarsInserted,
        quotes_inserted: totalQuotesInserted
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Market data sync error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Market data sync failed',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
