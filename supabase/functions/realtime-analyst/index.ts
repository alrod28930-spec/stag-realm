import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Personality-based voice mapping
const PERSONALITY_VOICES = {
  'mentor': { voice: 'sage', description: 'Wise mentor with calm authority' },
  'coach': { voice: 'alloy', description: 'Encouraging performance coach' },
  'analyst': { voice: 'nova', description: 'Sharp analytical thinker' },
  'advisor': { voice: 'shimmer', description: 'Professional financial advisor' },
  'teacher': { voice: 'echo', description: 'Patient educational guide' },
  'strategist': { voice: 'onyx', description: 'Strategic military-style advisor' },
} as const;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not found');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { personality = 'mentor', systemPrompt, sessionId, type, audio } = await req.json();
    
    console.log(`Realtime analyst request - Type: ${type}, Personality: ${personality}, Session: ${sessionId}`);
    
    const personalityConfig = PERSONALITY_VOICES[personality as keyof typeof PERSONALITY_VOICES] || PERSONALITY_VOICES.mentor;
    
    if (type === 'input_audio_buffer.append') {
      // Handle audio input - for now, return acknowledgment
      console.log('Received audio buffer, length:', audio?.length || 0);
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Audio received'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Initial connection setup
    const basePrompt = systemPrompt || `You are a sophisticated financial analyst and trading expert with the personality of a ${personalityConfig.description}.

PERSONALITY: ${personality.toUpperCase()}
- Voice characteristics: ${personalityConfig.description}
- Communication style: Professional yet approachable, data-driven insights
- Expertise: Real-time market analysis, portfolio optimization, risk management, trading strategies

CAPABILITIES:
- Real-time portfolio analysis and recommendations
- Market sentiment and technical analysis  
- Risk assessment and compliance monitoring
- Educational explanations of financial concepts
- Trade execution guidance and timing
- Voice-first interactions with immediate responses

GUIDELINES:
- Keep responses concise but informative (30-60 seconds of speech)
- Use natural, conversational language
- Provide actionable insights when possible
- Always mention risk considerations
- Be encouraging but realistic about market conditions
- Ask clarifying questions to better assist the user

Current context: User is accessing the StagAlgo trading platform and wants real-time financial guidance through voice interaction.`;

    // For initial setup, return session configuration
    const response = {
      success: true,
      sessionId,
      personality,
      voice: personalityConfig.voice,
      message: `Voice analyst ${personalityConfig.description} is ready. You can now speak to get real-time financial insights.`,
      systemPrompt: basePrompt
    };

    console.log('Session initialized successfully');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in realtime-analyst function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});