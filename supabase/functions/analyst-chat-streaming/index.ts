import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting
const RATE_LIMIT = { maxRequestsPerMinute: 15, windowMs: 60000 };
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }
  
  if (userLimit.count >= RATE_LIMIT.maxRequestsPerMinute) {
    return { allowed: false, retryAfter: Math.ceil((userLimit.resetAt - now) / 1000) };
  }
  
  userLimit.count++;
  return { allowed: true };
}

const SYSTEM_PROMPT = `You are a Strategic Financial Analyst providing professional, data-driven analysis for the StagAlgo trading platform.

CORE PERSONALITY:
- Professional and precise in communication
- Educational focus (not financial advice)
- Risk-aware and compliance-focused
- Technical accuracy with accessibility
- Clear explanations with concrete examples

RESPONSE STYLE:
- Begin with a brief, direct answer
- Support with relevant data and context
- Use bullet points for complex information
- Include disclaimers when discussing market opinions
- Keep responses focused and actionable

IMPORTANT:
- Never provide personalized financial advice
- Always emphasize educational purpose
- Acknowledge limitations and uncertainties
- Encourage users to consult qualified professionals`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now();

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

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      console.log(`⚠️ Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter,
        message: `Too many requests. Please wait ${rateCheck.retryAfter} seconds.`
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateCheck.retryAfter) }
      });
    }

    const { message, workspace_id, context } = await req.json()
    if (!message) throw new Error('Message is required')

    console.log('📨 Analyst chat streaming request:', { userId: user.id, messageLength: message.length })

    // Build context-aware prompt
    const systemPrompt = `${SYSTEM_PROMPT}

PORTFOLIO CONTEXT:
${context?.portfolioData ? `- Total Value: $${context.portfolioData.totalEquity?.toLocaleString()}
- Positions: ${context.portfolioData.positions?.length || 0}
- Cash: $${context.portfolioData.availableCash?.toLocaleString()}` : '- No portfolio data available'}

RISK METRICS:
${context?.riskMetrics ? `- Volatility: ${(context.riskMetrics.portfolioVolatility * 100).toFixed(1)}%
- Sharpe Ratio: ${context.riskMetrics.sharpeRatio?.toFixed(2)}
- Max Drawdown: ${(context.riskMetrics.maxDrawdown * 100).toFixed(1)}%` : '- No risk data available'}

${context?.isDemoMode ? '⚠️ USER IS IN DEMO MODE - Explain this is educational data only.' : ''}

GUIDELINES:
- Be conversational and helpful
- Reference user's specific portfolio when relevant
- Provide actionable insights
- Keep responses focused and concise
- Include disclaimers when giving market opinions`;

    // Call Lovable AI Gateway for streaming
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded on AI gateway',
          message: 'Too many AI requests. Please wait a moment before trying again.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({
          error: 'Payment required',
          message: 'Lovable AI credits exhausted. Please add credits in Settings.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    // Log interaction for analytics
    try {
      await supabaseClient.from('analyst_outputs').insert({
        workspace_id: workspace_id,
        input_json: { message, context },
        model: 'google/gemini-2.5-flash',
        input_kind: 'chat_streaming',
        ts: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Streaming started in ${processingTime}ms`);

    // Return the stream directly with proper headers
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Processing-Time': String(processingTime)
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Analyst chat streaming error:', error)
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to process chat',
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      processingTimeMs: processingTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
