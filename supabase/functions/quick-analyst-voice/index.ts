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


// Wrap raw PCM16 (little-endian) into a valid WAV container
function createWavFromPCM16(pcmBytes: Uint8Array, sampleRate = 24000, numChannels = 1) {
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // WAV header is 44 bytes
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.byteLength, true); // file size - 8
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true);  // Audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.byteLength, true);

  const wavBytes = new Uint8Array(44 + pcmBytes.byteLength);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(pcmBytes, 44);
  return wavBytes;
}

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
    
    // Step 1: Verify audio authenticity and quality
    console.log('Verifying audio input...');
    if (!await verifyAudioInput(binaryAudio)) {
      throw new Error('Audio verification failed - invalid or suspicious audio input');
    }

    // Step 2: Convert audio to text using Whisper
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    const transcriptFormData = new FormData();
    // Wrap PCM16 bytes into a valid WAV container for Whisper
    const wavBytes = createWavFromPCM16(binaryAudio, 24000, 1);
    const audioBlob = new Blob([wavBytes], { type: 'audio/wav' });
    transcriptFormData.append('file', audioBlob, 'audio.wav');
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
    const userQuestion = (transcriptResult.text || '').trim() || 'Give me a concise real-time market overview and any important risks I should watch.';
    
    console.log('Transcribed question:', userQuestion);
    
    // Step 3: Generate intelligent response using GPT-4o with function calling
    const systemPrompt = `You are ${personalityConfig.name}, a sophisticated financial analyst with the personality of a ${personalityConfig.description} serving on the StagAlgo trading platform.

PERSONALITY & VOICE:
${personality.includes('mentor') ? '- Wise and nurturing guide who provides confident direction with compassionate authority' : ''}
${personality.includes('analyst') ? '- Sharp analytical mind who cuts through noise to deliver data-driven insights with precision' : ''}
${personality.includes('coach') ? '- Motivational performance coach who energizes and pushes for optimal trading results' : ''}
${personality.includes('advisor') ? '- Professional consultant who delivers expert financial advice with institutional credibility' : ''}
${personalityConfig.gender === 'female' ? '- Communicate with empathetic collaboration while maintaining professional expertise' : '- Deliver insights with authoritative directness while remaining approachable'}

CAPABILITIES & TOOLS:
You have access to real-time trading tools and data:
- Portfolio analysis (positions, P&L, allocation)
- Market sentiment and technical indicators  
- Risk assessment and compliance monitoring
- Live market data and sector performance

RESPONSE STYLE:
- Keep responses conversational and under 45 seconds when spoken
- Use natural, confident language with contractions
- Always provide actionable insights when possible
- Mention specific risks or opportunities with concrete data
- Reference actual portfolio positions and market levels when relevant
- Be encouraging yet realistic about market conditions

CONTEXT: User is actively trading on StagAlgo and needs immediate insights for decision-making.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_portfolio_data',
              description: 'Get current portfolio performance, positions, and P&L data',
              parameters: {
                type: 'object',
                properties: {
                  detail_level: { 
                    type: 'string', 
                    enum: ['summary', 'detailed'],
                    description: 'Level of portfolio detail to return'
                  }
                },
                required: []
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_market_analysis',
              description: 'Get current market conditions, sentiment, and sector performance',
              parameters: {
                type: 'object',
                properties: {
                  symbols: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Specific stock symbols to analyze (optional)'
                  }
                },
                required: []
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'assess_risk',
              description: 'Evaluate portfolio risk levels and compliance status',
              parameters: {
                type: 'object',
                properties: {
                  position_symbol: { 
                    type: 'string',
                    description: 'Specific symbol to assess risk for (optional)'
                  }
                },
                required: []
              }
            }
          }
        ],
        tool_choice: 'auto',
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`Failed to generate response: ${chatResponse.status}`);
    }
    
    const chatResult = await chatResponse.json();
    console.log('GPT-4o response:', JSON.stringify(chatResult, null, 2));
    
    // Handle function calls if present
    let textResponse = '';
    const toolResults: any[] = [];
    
    if (chatResult.choices[0].message.tool_calls) {
      console.log('Processing function calls...');
      
      // Execute function calls
      for (const toolCall of chatResult.choices[0].message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || '{}');
        
        console.log(`Executing function: ${functionName} with args:`, args);
        
        let result;
        switch (functionName) {
          case 'get_portfolio_data':
            result = await getPortfolioData(args.detail_level);
            break;
          case 'get_market_analysis':
            result = await getMarketAnalysis(args.symbols);
            break;
          case 'assess_risk':
            result = await assessRisk(args.position_symbol);
            break;
          default:
            result = { error: `Unknown function: ${functionName}` };
        }
        
        toolResults.push({ function: functionName, result });
      }
      
      // Get final response with function results
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuestion },
            { 
              role: 'assistant', 
              content: null,
              tool_calls: chatResult.choices[0].message.tool_calls
            },
            ...chatResult.choices[0].message.tool_calls.map((toolCall: any, index: number) => ({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResults[index].result)
            }))
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      
      if (followUpResponse.ok) {
        const followUpResult = await followUpResponse.json();
        textResponse = followUpResult.choices[0].message.content;
      } else {
        textResponse = "I have the data but encountered an issue formatting the response. Let me give you a quick summary of your portfolio status.";
      }
    } else {
      textResponse = chatResult.choices[0].message.content;
    }
    
    console.log('Generated intelligent response with tools:', textResponse);
    
    // Step 4: Convert text to speech using the personality's voice
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
      tool_calls: toolResults.length > 0 ? toolResults : undefined,
      verification_status: 'verified',
      format: 'mp3'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in quick-analyst-voice function:', error);
    
    // Enhanced error handling with specific error types
    let errorMessage = 'I apologize, but I encountered an issue processing your request.';
    let statusCode = 500;
    
    if (error.message.includes('Audio verification failed')) {
      errorMessage = 'Audio input verification failed. Please try speaking again.';
      statusCode = 400;
    } else if (error.message.includes('Failed to transcribe')) {
      errorMessage = 'I had trouble understanding your audio. Could you please try again?';
      statusCode = 422;
    } else if (error.message.includes('Failed to generate response')) {
      errorMessage = 'I\'m having difficulty processing your question right now. Please try again.';
      statusCode = 503;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
      verification_status: 'failed'
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});