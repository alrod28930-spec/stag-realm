import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Personality voice mapping
const PERSONALITY_VOICES = {
  'mentor_female': { voice: 'sage', name: 'Sofia' },
  'mentor_male': { voice: 'onyx', name: 'Marcus' },
  'analyst_female': { voice: 'coral', name: 'Victoria' },
  'analyst_male': { voice: 'alloy', name: 'David' },
  'coach_female': { voice: 'ballad', name: 'Emma' },
  'coach_male': { voice: 'echo', name: 'Jake' },
  'advisor_female': { voice: 'shimmer', name: 'Diana' },
  'advisor_male': { voice: 'ash', name: 'Robert' },
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
    const { audio, personality = 'mentor_female', format = 'voice_response' } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`Processing quick voice request for personality: ${personality}`);
    
    const personalityConfig = PERSONALITY_VOICES[personality as keyof typeof PERSONALITY_VOICES] || PERSONALITY_VOICES.mentor_female;
    
    // Step 1: Convert audio to text using Whisper
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    const transcriptFormData = new FormData();
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    transcriptFormData.append('file', audioBlob, 'audio.webm');
    transcriptFormData.append('model', 'whisper-1');
    
    const transcriptResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: transcriptFormData,
    });
    
    if (!transcriptResponse.ok) {
      throw new Error('Failed to transcribe audio');
    }
    
    const transcriptResult = await transcriptResponse.json();
    const userQuestion = transcriptResult.text;
    
    console.log('Transcribed question:', userQuestion);
    
    // Step 2: Generate text response based on personality
    const systemPrompt = `You are ${personalityConfig.name}, a sophisticated financial analyst with expertise in trading and portfolio management. 

PERSONALITY TRAITS:
- ${personality.includes('mentor') ? 'Wise and nurturing, providing guidance with authority' : ''}
- ${personality.includes('analyst') ? 'Sharp and analytical, focusing on data-driven insights' : ''}
- ${personality.includes('coach') ? 'Motivational and goal-oriented, encouraging performance' : ''}
- ${personality.includes('advisor') ? 'Professional and consultative, offering expert advice' : ''}

RESPONSE GUIDELINES:
- Keep responses conversational and under 30 seconds when spoken
- Provide actionable financial insights when possible
- Always mention relevant risks or considerations
- Use natural, spoken language (contractions, etc.)
- Be encouraging but realistic about market conditions
- Reference current market context when relevant

USER CONTEXT: The user is actively using the StagAlgo trading platform and has asked a quick voice question during their trading session.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    
    if (!chatResponse.ok) {
      throw new Error('Failed to generate response');
    }
    
    const chatResult = await chatResponse.json();
    const textResponse = chatResult.choices[0].message.content;
    
    console.log('Generated text response:', textResponse);
    
    // Step 3: Convert text to speech using the personality's voice
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: textResponse,
        voice: personalityConfig.voice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    });
    
    if (!ttsResponse.ok) {
      throw new Error('Failed to generate speech');
    }
    
    // Convert audio to base64
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    console.log('Successfully generated voice response');
    
    return new Response(JSON.stringify({
      success: true,
      personality_name: personalityConfig.name,
      personality_voice: personalityConfig.voice,
      user_question: userQuestion,
      text_response: textResponse,
      audio_response: audioBase64,
      format: 'mp3'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in quick-analyst-voice function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});