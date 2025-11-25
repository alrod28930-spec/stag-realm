import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System prompts for different analyst personas
const ANALYST_PERSONAS = {
  mentor: {
    name: "AI Mentor",
    systemPrompt: `You are an experienced investment mentor and portfolio advisor. You provide clear, educational explanations about portfolio performance, market conditions, and trading decisions. Always include learning opportunities in your responses and use a supportive, encouraging tone. Focus on helping users understand the 'why' behind market movements and portfolio decisions.`
  },
  analyst: {
    name: "Technical Analyst", 
    systemPrompt: `You are a professional technical analyst with expertise in chart patterns, indicators, and market analysis. Provide detailed technical insights, identify trading opportunities, and explain market dynamics using technical analysis principles. Be precise and data-driven in your analysis.`
  },
  strategist: {
    name: "Investment Strategist",
    systemPrompt: `You are a strategic investment advisor focused on long-term wealth building and portfolio optimization. Analyze portfolio allocation, risk management, and strategic positioning. Provide insights on sector rotation, asset allocation, and long-term market trends.`
  },
  risk_manager: {
    name: "Risk Manager",
    systemPrompt: `You are a portfolio risk manager focused on protecting capital and managing downside risk. Analyze portfolio risk metrics, concentration risk, volatility, and provide recommendations for risk mitigation. Always prioritize capital preservation and prudent risk management.`
  }
}

// Mock data generators for BID integration
function generatePortfolioData(isDemoMode: boolean, demoScenario?: string) {
  if (!isDemoMode) {
    return {
      totalEquity: 0,
      availableCash: 0,
      positions: [],
      performance: { totalReturn: 0, totalReturnPercent: 0 }
    };
  }

  // Demo data based on scenario
  const scenarios = {
    conservative_investor: {
      totalEquity: 85000,
      availableCash: 15000,
      positions: [
        { symbol: 'VTI', allocation: 40, unrealizedPnL: 1200 },
        { symbol: 'BND', allocation: 30, unrealizedPnL: 150 },
        { symbol: 'VXUS', allocation: 20, unrealizedPnL: -200 },
        { symbol: 'VNQ', allocation: 10, unrealizedPnL: 300 }
      ]
    },
    day_trader: {
      totalEquity: 50000,
      availableCash: 25000,
      positions: [
        { symbol: 'SPY', allocation: 25, unrealizedPnL: 450 },
        { symbol: 'QQQ', allocation: 20, unrealizedPnL: -150 },
        { symbol: 'TSLA', allocation: 15, unrealizedPnL: 800 },
        { symbol: 'NVDA', allocation: 15, unrealizedPnL: -300 }
      ]
    },
    long_term_growth: {
      totalEquity: 120000,
      availableCash: 8000,
      positions: [
        { symbol: 'AAPL', allocation: 15, unrealizedPnL: 2400 },
        { symbol: 'GOOGL', allocation: 12, unrealizedPnL: 1800 },
        { symbol: 'MSFT', allocation: 18, unrealizedPnL: 3200 },
        { symbol: 'AMZN', allocation: 10, unrealizedPnL: -500 },
        { symbol: 'NVDA', allocation: 8, unrealizedPnL: 1200 }
      ]
    }
  };

  return scenarios[demoScenario as keyof typeof scenarios] || scenarios.long_term_growth;
}

function generateMarketData() {
  return {
    spyPrice: 445.20,
    spyChange: 0.85,
    vix: 18.3,
    marketSentiment: 'cautiously optimistic',
    sectorLeaders: ['Technology', 'Healthcare', 'Financials'],
    sectorLaggards: ['Real Estate', 'Utilities']
  };
}

function generateRiskMetrics(portfolioData: any) {
  return {
    portfolioVolatility: 0.16,
    sharpeRatio: 1.1,
    maxDrawdown: 0.08,
    beta: 0.95,
    concentrationRisk: Math.max(...portfolioData.positions.map((p: any) => p.allocation)) / 100,
    portfolioValue: portfolioData.totalEquity
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user
    if (!user) throw new Error('Unauthorized')

    const { message, persona = 'mentor', workspace_id } = await req.json()
    if (!message) throw new Error('Message is required')

    console.log('Processing analyst chat request:', { userId: user.id, persona, workspaceId: workspace_id })

    // Get user BID profile
    const { data: userBIDProfile } = await supabaseClient
      .from('user_bid_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspace_id || null)
      .maybeSingle()

    // Get user profile for context
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const isDemoMode = userProfile?.display_name === 'Demo User' || userBIDProfile?.demo_mode || false
    const demoScenario = userBIDProfile?.profile_data?.demoData?.scenario || 'long_term_growth'

    // Generate or retrieve BID data
    const portfolioData = userBIDProfile?.profile_data?.portfolio || generatePortfolioData(isDemoMode, demoScenario)
    const riskMetrics = userBIDProfile?.profile_data?.riskMetrics || generateRiskMetrics(portfolioData)
    const marketData = generateMarketData()
    const tradingProfile = userBIDProfile?.profile_data?.tradingProfile
    const learningProfile = userBIDProfile?.profile_data?.learningProfile

    // Enhanced system prompt with BID context
    const selectedPersona = ANALYST_PERSONAS[persona as keyof typeof ANALYST_PERSONAS] || ANALYST_PERSONAS.mentor
    const contextualPrompt = `${selectedPersona.systemPrompt}

CURRENT USER CONTEXT:
- Demo Mode: ${isDemoMode ? 'Yes' : 'No'}${isDemoMode ? ` (Scenario: ${demoScenario})` : ''}
- Experience Level: ${learningProfile?.experienceLevel || 'intermediate'}
- Risk Profile: ${tradingProfile?.riskTolerance || 5}/10
- Trading Style: ${tradingProfile?.tradingStyle || 'active'}

PORTFOLIO SUMMARY:
- Total Equity: $${portfolioData.totalEquity?.toLocaleString() || '0'}
- Available Cash: $${portfolioData.availableCash?.toLocaleString() || '0'}
- Position Count: ${portfolioData.positions?.length || 0}
- Top Holdings: ${portfolioData.positions?.slice(0, 3).map((p: any) => `${p.symbol} (${p.allocation}%)`).join(', ') || 'None'}

RISK METRICS:
- Portfolio Volatility: ${(riskMetrics.portfolioVolatility * 100).toFixed(1)}%
- Sharpe Ratio: ${riskMetrics.sharpeRatio?.toFixed(2) || 'N/A'}
- Max Drawdown: ${(riskMetrics.maxDrawdown * 100).toFixed(1)}%
- Beta: ${riskMetrics.beta?.toFixed(2) || 'N/A'}

MARKET CONTEXT:
- SPY: $${marketData.spyPrice} (${marketData.spyChange > 0 ? '+' : ''}${marketData.spyChange}%)
- VIX: ${marketData.vix}
- Sentiment: ${marketData.marketSentiment}

IMPORTANT GUIDELINES:
1. Always reference the user's specific portfolio data when relevant
2. Provide personalized insights based on their risk profile and experience level
3. ${isDemoMode ? 'Explain that this is demo data for learning purposes' : 'Use real portfolio data for analysis'}
4. Offer actionable insights and learning opportunities
5. Consider their trading style and preferences in recommendations
6. Be encouraging and educational, especially for beginners`

    // Call OpenAI GPT-4o for analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: contextualPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const aiResult = await openaiResponse.json()
    const aiResponse = aiResult.choices[0].message.content

    // Log the interaction for learning
    await supabaseClient
      .from('analyst_outputs')
      .insert({
        workspace_id: workspace_id,
        input_json: {
          message,
          persona,
          context: {
            portfolioValue: portfolioData.totalEquity,
            positionCount: portfolioData.positions?.length || 0,
            riskLevel: tradingProfile?.riskTolerance || 5,
            experienceLevel: learningProfile?.experienceLevel || 'intermediate'
          }
        },
        output_text: aiResponse,
        model: 'gpt-4o',
        input_kind: 'chat_enhanced'
      })

    // Store or update analyst context
    await supabaseClient
      .from('analyst_context')
      .upsert({
        user_id: user.id,
        workspace_id: workspace_id,
        session_id: `session_${Date.now()}`,
        context_data: {
          lastQuery: message,
          persona,
          portfolioContext: portfolioData,
          riskContext: riskMetrics,
          marketContext: marketData
        }
      })

    console.log('Enhanced analyst chat completed successfully')

    return new Response(JSON.stringify({
      response: aiResponse,
      persona: selectedPersona.name,
      context: {
        portfolioValue: portfolioData.totalEquity,
        positionCount: portfolioData.positions?.length || 0,
        demoMode: isDemoMode,
        riskLevel: tradingProfile?.riskTolerance || 5
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // TypeScript error handling fix
    console.error('Enhanced analyst chat error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to process analyst chat',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})