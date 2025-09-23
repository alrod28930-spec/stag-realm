import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketDataRequest {
  symbols?: string[];
  dataTypes?: ('price' | 'volume' | 'news' | 'options')[];
  timeframe?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get request data
    const { symbols = ['SPY', 'QQQ', 'AAPL'], dataTypes = ['price'], timeframe = '1Min' }: MarketDataRequest = 
      await req.json().catch(() => ({}))

    // Get API credentials from environment
    const alpacaApiKey = Deno.env.get('ALPACA_API_KEY')
    const alpacaSecretKey = Deno.env.get('ALPACA_SECRET_KEY')

    if (!alpacaApiKey || !alpacaSecretKey) {
      console.error('Missing Alpaca API credentials')
      return new Response('API credentials not configured', { status: 500, headers: corsHeaders })
    }

    const results = []
    
    // Fetch real-time market data for each requested data type
    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'price':
          const priceData = await fetchAlpacaPrices(symbols, alpacaApiKey, alpacaSecretKey)
          results.push({
            type: 'price',
            data: priceData,
            timestamp: new Date().toISOString()
          })
          break
          
        case 'volume':
          const volumeData = await fetchAlpacaVolume(symbols, timeframe, alpacaApiKey, alpacaSecretKey)
          results.push({
            type: 'volume',
            data: volumeData,
            timestamp: new Date().toISOString()
          })
          break
          
        case 'news':
          const newsData = await fetchAlpacaNews(symbols, alpacaApiKey, alpacaSecretKey)
          results.push({
            type: 'news',
            data: newsData,
            timestamp: new Date().toISOString()
          })
          break
          
        case 'options':
          // For now, generate synthetic options data since Alpaca paper doesn't have options
          results.push({
            type: 'options',
            data: generateSyntheticOptionsData(symbols),
            timestamp: new Date().toISOString()
          })
          break
      }
    }

    // Store the fetched data in the database for analysis
    for (const result of results) {
      await supabase.from('oracle_signals').insert({
        user_id: user.id,
        signal_type: 'market_data',
        symbol: symbols.join(','),
        data: result,
        confidence: 0.9,
        severity: 'medium',
        created_at: new Date().toISOString()
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: results,
        symbols: symbols,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Oracle realtime data error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch market data', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function fetchAlpacaPrices(symbols: string[], apiKey: string, secretKey: string) {
  const symbolsParam = symbols.join(',')
  const response = await fetch(`https://paper-api.alpaca.markets/v2/stocks/quotes/latest?symbols=${symbolsParam}`, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status}`)
  }

  const data = await response.json()
  return Object.entries(data.quotes || {}).map(([symbol, quote]: [string, any]) => ({
    symbol,
    price: quote.bp || quote.ap || 0,
    bid: quote.bp,
    ask: quote.ap,
    bidSize: quote.bs,
    askSize: quote.as,
    timestamp: quote.t
  }))
}

async function fetchAlpacaVolume(symbols: string[], timeframe: string, apiKey: string, secretKey: string) {
  const results = []
  
  for (const symbol of symbols) {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      
      const response = await fetch(
        `https://paper-api.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=${timeframe}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': secretKey,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const bars = data.bars || []
        const totalVolume = bars.reduce((sum: number, bar: any) => sum + (bar.v || 0), 0)
        const avgVolume = bars.length > 0 ? totalVolume / bars.length : 0
        
        results.push({
          symbol,
          currentVolume: bars[bars.length - 1]?.v || 0,
          averageVolume: avgVolume,
          volumeRatio: avgVolume > 0 ? (bars[bars.length - 1]?.v || 0) / avgVolume : 1,
          bars: bars.slice(-20) // Last 20 bars
        })
      }
    } catch (error) {
      console.error(`Volume fetch error for ${symbol}:`, error)
    }
  }
  
  return results
}

async function fetchAlpacaNews(symbols: string[], apiKey: string, secretKey: string) {
  try {
    const symbolsParam = symbols.join(',')
    const response = await fetch(
      `https://paper-api.alpaca.markets/v1beta1/news?symbols=${symbolsParam}&limit=50`,
      {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': secretKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.status}`)
    }

    const data = await response.json()
    return (data.news || []).map((article: any) => ({
      id: article.id,
      headline: article.headline,
      summary: article.summary,
      author: article.author,
      symbols: article.symbols,
      url: article.url,
      timestamp: article.created_at
    }))
  } catch (error) {
    console.error('News fetch error:', error)
    return []
  }
}

function generateSyntheticOptionsData(symbols: string[]) {
  return symbols.map(symbol => ({
    symbol,
    unusual_activity: Math.random() > 0.7,
    call_put_ratio: 0.8 + Math.random() * 0.4,
    implied_volatility: 0.15 + Math.random() * 0.3,
    volume_spike: Math.random() > 0.8,
    synthetic: true
  }))
}