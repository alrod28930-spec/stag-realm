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
      .select('workspace_id, api_key_cipher, api_secret_cipher, nonce')
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

        // Get Alpaca credentials (decrypt via edge function)
        const { data: credData, error: credError } = await supabase.functions.invoke(
          'decrypt-brokerage-credentials',
          { body: { workspace_id: conn.workspace_id } }
        );

        if (credError || !credData?.api_key) {
          console.error(`❌ Failed to decrypt credentials for ${conn.workspace_id}`);
          continue;
        }

        const apiKey = credData.api_key;
        const apiSecret = credData.api_secret;

        // Detect account type (paper vs live)
        const { data: accountType } = await supabase.functions.invoke(
          'detect-account-type',
          { body: { api_key: apiKey, api_secret: apiSecret } }
        );

        const baseUrl = accountType?.is_paper
          ? 'https://paper-api.alpaca.markets'
          : 'https://api.alpaca.markets';

        console.log(`🔑 Using ${accountType?.is_paper ? 'paper' : 'live'} API`);

        // Get positions to fetch bars for held symbols
        const { data: positions } = await supabase
          .from('positions_current')
          .select('symbol')
          .eq('workspace_id', conn.workspace_id);

        const positionSymbols = positions?.map(p => p.symbol) || [];
        const allSymbols = [...new Set([...positionSymbols, ...marketIndices])];

        if (allSymbols.length === 0) {
          console.log('⚠️ No symbols to sync for this workspace');
          continue;
        }

        console.log(`📈 Fetching data for ${allSymbols.length} symbols...`);

        // Fetch 1-day bars for the last 100 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 100);

        for (const symbol of allSymbols) {
          try {
            // Fetch bars
            const barsUrl = `${baseUrl}/v2/stocks/${symbol}/bars?` +
              `start=${startDate.toISOString().split('T')[0]}&` +
              `end=${endDate.toISOString().split('T')[0]}&` +
              `timeframe=1Day&limit=100`;

            const barsResponse = await fetch(barsUrl, {
              headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret,
              }
            });

            if (!barsResponse.ok) {
              console.error(`Failed to fetch bars for ${symbol}`);
              continue;
            }

            const barsData = await barsResponse.json();
            const bars: AlpacaBar[] = barsData.bars || [];

            // Insert bars into candles table
            if (bars.length > 0) {
              const candleRecords = bars.map(bar => ({
                workspace_id: conn.workspace_id,
                symbol,
                tf: '1D',
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
                console.error(`Error inserting candles for ${symbol}:`, insertError);
              } else {
                totalBarsInserted += bars.length;
                console.log(`✅ Inserted ${bars.length} bars for ${symbol}`);
              }
            }

            // Fetch latest quote for market_data
            const quoteUrl = `${baseUrl}/v2/stocks/${symbol}/quotes/latest`;
            const quoteResponse = await fetch(quoteUrl, {
              headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret,
              }
            });

            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              const quote = quoteData.quote as AlpacaQuote;

              if (quote && bars.length > 0) {
                const lastBar = bars[bars.length - 1];
                const currentPrice = (quote.ap + quote.bp) / 2;
                const prevClose = lastBar.c;
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
                    volume: lastBar.v,
                    high: lastBar.h,
                    low: lastBar.l,
                    open: lastBar.o,
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
