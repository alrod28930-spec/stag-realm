import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalystResponse {
  mode: 'education' | 'diagnostic' | 'overview' | 'risk_alert'
  summary: string
  kpis?: Record<string, number>
  cards?: Array<{
    type: string
    [key: string]: any
  }>
  actions?: Array<{
    label: string
    target: string
  }>
  sources?: Array<{
    kind: string
    id?: string
    title?: string
  }>
  disclaimer: string
  voice?: {
    enabled: boolean
    audio_url?: string
  }
  error?: string
  feature?: string
  required_tier?: string
}

// Compliance guard - classify user intent
function classifyIntent(prompt: string): { 
  type: 'education' | 'analysis' | 'directive' | 'restricted', 
  warnings: string[] 
} {
  const promptLower = prompt.toLowerCase()
  const warnings: string[] = []

  // Directive patterns (action-oriented)
  const directivePatterns = [
    /\b(buy|sell|purchase|trade|execute|place.*order)\b/,
    /\b(go long|go short|short|long)\b/,
    /\b(invest in|put money|allocate)\b/,
    /\bnow\b.*\b(buy|sell)\b/
  ]

  // Restricted patterns (regulatory/complex)
  const restrictedPatterns = [
    /\b(options|derivatives|futures|forex|crypto)\b/,
    /\b(margin|leverage|borrow)\b/,
    /\b(day.?trad|pdt|pattern.*day)\b/,
    /\b(guarantee|promise|sure.*thing)\b/
  ]

  // Check for restricted content
  if (restrictedPatterns.some(pattern => pattern.test(promptLower))) {
    warnings.push('This topic requires additional compliance acknowledgment')
    return { type: 'restricted', warnings }
  }

  // Check for directives
  if (directivePatterns.some(pattern => pattern.test(promptLower))) {
    warnings.push('Converting directive to educational scenario analysis')
    return { type: 'directive', warnings }
  }

  // Check for analysis requests
  const analysisPatterns = [
    /\b(analyze|explain|why|what.*happen|compare|evaluate)\b/,
    /\b(performance|risk|portfolio|position)\b/,
    /\b(should.*i|recommend|suggest|opinion)\b/
  ]

  if (analysisPatterns.some(pattern => pattern.test(promptLower))) {
    return { type: 'analysis', warnings }
  }

  // Default to education
  return { type: 'education', warnings }
}

// Tool definitions for OpenAI function calling
const tools = [
  {
    type: "function",
    function: {
      name: "get_portfolio_snapshot",
      description: "Get current portfolio data including positions, cash, and risk metrics",
      parameters: {
        type: "object",
        properties: {
          workspace_id: { type: "string", description: "Workspace ID" }
        },
        required: ["workspace_id"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "get_recent_trades",
      description: "Get recent trade history and executions",
      parameters: {
        type: "object",
        properties: {
          workspace_id: { type: "string", description: "Workspace ID" },
          since: { type: "string", description: "ISO timestamp to filter from" },
          limit: { type: "number", description: "Max number of trades to return" }
        },
        required: ["workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calc_kpis", 
      description: "Calculate performance KPIs from trade data",
      parameters: {
        type: "object",
        properties: {
          trades: { 
            type: "array",
            description: "Array of trade objects",
            items: { type: "object" }
          }
        },
        required: ["trades"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "risk_eval",
      description: "Evaluate current portfolio risk and check for halts",
      parameters: {
        type: "object", 
        properties: {
          snapshot: { type: "object", description: "Portfolio snapshot data" },
          workspace_id: { type: "string", description: "Workspace ID" }
        },
        required: ["snapshot", "workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "oracle_signals",
      description: "Get Oracle market signals and analysis",
      parameters: {
        type: "object",
        properties: {
          symbols: { 
            type: "array", 
            items: { type: "string" },
            description: "Stock symbols to filter by" 
          },
          horizon: { 
            type: "string", 
            enum: ["intraday", "swing", "macro"],
            description: "Time horizon for signals" 
          },
          workspace_id: { type: "string", description: "Workspace ID" }
        },
        required: ["workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "simulate_order",
      description: "Simulate order execution for educational/scenario analysis",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock symbol" },
          side: { type: "string", enum: ["buy", "sell"], description: "Order side" },
          size: { type: "number", description: "Order size/quantity" },
          workspace_id: { type: "string", description: "Workspace ID" }
        },
        required: ["symbol", "side", "size"]
      }
    }
  }
]

async function callTool(toolName: string, args: any, authToken: string) {
  const functionMap: { [key: string]: string } = {
    'get_portfolio_snapshot': 'analyst-portfolio',
    'get_recent_trades': 'analyst-trades', 
    'calc_kpis': 'analyst-kpis',
    'risk_eval': 'analyst-risk',
    'oracle_signals': 'analyst-oracle',
    'simulate_order': 'analyst-simulate'
  }

  const functionName = functionMap[toolName]
  if (!functionName) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  const response = await fetch(`https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tool ${toolName} failed: ${error}`)
  }

  return await response.json()
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

    const { 
      message, 
      workspace_id, 
      session_context = {},
      persona = 'mentor'
    } = await req.json()

    if (!message || !workspace_id) {
      throw new Error('message and workspace_id are required')
    }

    // Compliance guard
    const intent = classifyIntent(message)
    
    // Log chat request
    await supabaseClient.from('analyst_telemetry').insert({
      workspace_id,
      user_id: user.id,
      event: 'chat_request',
      payload: { intent: intent.type, warnings: intent.warnings }
    })

    // Check for compliance blocks
    if (intent.type === 'restricted') {
      await supabaseClient.from('analyst_telemetry').insert({
        workspace_id,
        user_id: user.id,
        event: 'compliance_block',
        payload: { reason: 'restricted_topic', message_preview: message.substring(0, 100) }
      })
    }

    // Get user preferences
    const { data: userPrefs } = await supabaseClient
      .from('user_prefs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Build system prompt
    const systemPrompt = `You are StagAlgo Analyst, an AI assistant focused on markets & money.

CORE PRINCIPLES:
- You are educational and analytical; you do not give financial advice or guarantees
- Always ground answers in workspace data (Portfolio/Orders/Oracle/Recorder) via function calls
- For math or performance calculations, call tools - don't estimate
- Respect subscription entitlements, risk halts, and jurisdiction gates
- Prefer concise takeaways with structured outputs and clear next actions

USER CONTEXT:
- Risk Profile: ${userPrefs?.risk_profile || 'medium'}
- Experience Level: ${userPrefs?.teach_level || 'intermediate'}  
- Time Horizon: ${userPrefs?.horizon || 'swing'}
- Persona: ${persona}

RESPONSE FORMAT:
Always return a JSON object with this structure:
{
  "mode": "education|diagnostic|overview|risk_alert",
  "summary": "one-paragraph takeaway in plain language",
  "kpis": { "winRate": 0.58, "sharpe": 1.21 }, // if relevant
  "cards": [
    { "type":"PositionCard","symbol":"AAPL","unrealizedPct":0.012,"note":"Technical note" }
  ],
  "actions": [
    { "label":"Review stops","target":"risk_toggles" }
  ],
  "sources": [
    { "kind":"Portfolio","id":"snapshot:2025-09-09" }
  ],
  "disclaimer": "Educational only. Not financial advice."
}

FUNCTION CALLING:
- Performance queries → get_portfolio_snapshot + get_recent_trades + calc_kpis
- "What changed" → get_recent_trades + oracle_signals  
- "Should I...?" → simulate_order + risk analysis + educational scenario
- Use tools for all data - never estimate numbers`

    // Handle different intent types
    let modifiedMessage = message
    if (intent.type === 'directive') {
      modifiedMessage = `Convert this to an educational scenario analysis: "${message}". Use simulate_order and explain pros/cons with risk considerations.`
    }

    // Call OpenAI with function calling
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: modifiedMessage }
    ]

    // Add session context if available
    if (session_context && Object.keys(session_context).length > 0) {
      messages.splice(1, 0, { 
        role: 'system', 
        content: `Recent context: ${JSON.stringify(session_context)}` 
      })
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const llmResult = await openaiResponse.json()
    const choice = llmResult.choices[0]

    // Handle tool calls
    let toolResults: any = {}
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        try {
          const result = await callTool(
            toolCall.function.name, 
            JSON.parse(toolCall.function.arguments),
            authHeader
          )
          toolResults[toolCall.function.name] = result
        } catch (error) {
          console.error(`Tool call failed: ${toolCall.function.name}`, error)
          toolResults[toolCall.function.name] = { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }

      // Make follow-up call with tool results
      const followUpMessages = [
        ...messages,
        choice.message,
        {
          role: 'user',
          content: `Tool results: ${JSON.stringify(toolResults)}. Now provide your structured JSON response based on this data.`
        }
      ]

      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: followUpMessages,
          max_completion_tokens: 2000,
          response_format: { type: 'json_object' }
        })
      })

      const followUpResult = await followUpResponse.json()
      choice.message = followUpResult.choices[0].message
    }

    // Parse the structured response
    let analystResponse: AnalystResponse
    try {
      analystResponse = JSON.parse(choice.message.content)
    } catch (error) {
      // Fallback if JSON parsing fails
      analystResponse = {
        mode: 'education',
        summary: choice.message.content || 'I apologize, but I encountered an issue processing your request.',
        disclaimer: 'Educational only. Not financial advice.',
        sources: [{ kind: 'System', title: 'Analyst Response' }]
      }
    }

    // Add compliance warnings if any
    if (intent.warnings.length > 0) {
      analystResponse.summary = `${intent.warnings.join('. ')}. ${analystResponse.summary}`
    }

    // Handle TTS if enabled
    if (userPrefs?.voice_enabled) {
      try {
        const ttsResponse = await fetch(`https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/analyst-tts`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: analystResponse.summary,
            workspace_id,
            voice_opts: { voice: 'alloy' }
          })
        })

        if (ttsResponse.ok) {
          const ttsResult = await ttsResponse.json()
          analystResponse.voice = {
            enabled: true,
            audio_url: ttsResult.audio_url
          }
        }
      } catch (error) {
        console.error('TTS failed:', error)
        analystResponse.voice = { enabled: false }
      }
    } else {
      analystResponse.voice = { enabled: false }
    }

    // Update session context
    await supabaseClient
      .from('analyst_sessions')
      .upsert({
        workspace_id,
        user_id: user.id,
        summary: {
          last_query: message,
          last_response_mode: analystResponse.mode,
          tools_used: Object.keys(toolResults),
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'workspace_id,user_id' })

    return new Response(JSON.stringify(analystResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Analyst chat error:', error)
    
    const errorResponse: AnalystResponse = {
      mode: 'education',
      summary: 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.',
      disclaimer: 'Educational only. Not financial advice.',
      sources: [{ kind: 'System', title: 'Error Response' }],
      voice: { enabled: false }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})