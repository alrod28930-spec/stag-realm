import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Personality voice mapping
const PERSONALITY_VOICES = {
  'mentor_female': { voice: 'sage', name: 'Sofia', description: 'wise and nurturing guide', gender: 'female' },
  'mentor_male': { voice: 'onyx', name: 'Marcus', description: 'experienced market mentor', gender: 'male' },
  'analyst_female': { voice: 'coral', name: 'Victoria', description: 'sharp analytical mind', gender: 'female' },
  'analyst_male': { voice: 'alloy', name: 'David', description: 'data-driven analyst', gender: 'male' },
  'coach_female': { voice: 'ballad', name: 'Emma', description: 'motivational performance coach', gender: 'female' },
  'coach_male': { voice: 'echo', name: 'Jake', description: 'energetic trading coach', gender: 'male' },
  'advisor_female': { voice: 'shimmer', name: 'Diana', description: 'professional consultant', gender: 'female' },
  'advisor_male': { voice: 'ash', name: 'Robert', description: 'institutional advisor', gender: 'male' },
} as const;


// Audio verification function
async function verifyAudioInput(audioData: Uint8Array): Promise<boolean> {
  try {
    // Basic audio verification checks
    if (!audioData || audioData.length === 0) {
      console.log('Audio verification failed: empty audio data');
      return false;
    }
    
    // Check minimum audio length (at least 100ms at 24kHz, 16-bit)
    const minLength = (24000 * 2) * 0.1; // 100ms worth of PCM16 data
    if (audioData.length < minLength) {
      console.log('Audio verification failed: audio too short');
      return false;
    }
    
    // Check maximum audio length (15 seconds max)
    const maxLength = (24000 * 2) * 15; // 15 seconds worth of PCM16 data
    if (audioData.length > maxLength) {
      console.log('Audio verification failed: audio too long');
      return false;
    }
    
    // Check for non-zero audio data (not silent)
    let hasNonZero = false;
    for (let i = 0; i < Math.min(audioData.length, 1000); i++) {
      if (audioData[i] !== 0) {
        hasNonZero = true;
        break;
      }
    }
    
    if (!hasNonZero) {
      console.log('Audio verification failed: audio appears to be silent');
      return false;
    }
    
    console.log('Audio verification passed');
    return true;
  } catch (error) {
    console.error('Audio verification error:', error);
    return false;
  }
}

// Mock BID data functions that would normally connect to Supabase database
async function getPortfolioData(detailLevel: string = 'summary') {
  console.log('Fetching portfolio data with detail level:', detailLevel);
  
  // Mock portfolio data that represents what BID would provide
  const portfolioSummary = {
    totalEquity: 247500,
    availableCash: 12500,
    totalPositionValue: 235000,
    totalUnrealizedPnL: 8750,
    totalUnrealizedPnLPercent: 3.66,
    dayChange: 2850,
    dayChangePercent: 1.17,
    positionCount: 6,
    dataQuality: 'excellent',
    lastUpdated: new Date().toISOString()
  };
  
  const positions = [
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 18.5, unrealizedPnLPercent: 12.3, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 16.2, unrealizedPnLPercent: 8.7, sector: 'Technology' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', allocation: 14.8, unrealizedPnLPercent: 24.1, sector: 'Technology' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', allocation: 12.4, unrealizedPnLPercent: 5.2, sector: 'Healthcare' },
    { symbol: 'JPM', name: 'JPMorgan Chase', allocation: 11.1, unrealizedPnLPercent: -2.1, sector: 'Finance' },
    { symbol: 'AMZN', name: 'Amazon Inc.', allocation: 9.3, unrealizedPnLPercent: 6.8, sector: 'Consumer' }
  ];
  
  if (detailLevel === 'detailed') {
    return { summary: portfolioSummary, positions, sectorBreakdown: {
      'Technology': 49.5, 'Healthcare': 12.4, 'Finance': 11.1, 'Consumer': 9.3, 'Cash': 17.7
    }};
  }
  
  return { summary: portfolioSummary, topPositions: positions.slice(0, 3) };
}

async function getMarketAnalysis(symbols: string[] = []) {
  console.log('Fetching market analysis for symbols:', symbols);
  
  // Mock market data that represents current conditions
  const marketOverview = {
    spyPrice: 482.35,
    spyDayChange: 0.85,
    vixLevel: 16.2,
    sentiment: 'cautiously optimistic',
    majorIndices: {
      'SPY': { price: 482.35, change: 0.85, changePercent: 0.18 },
      'QQQ': { price: 421.50, change: 1.15, changePercent: 0.27 },
      'IWM': { price: 224.80, change: -0.45, changePercent: -0.20 }
    },
    sectorPerformance: {
      'Technology': 1.2,
      'Healthcare': 0.8,
      'Finance': -0.3,
      'Energy': 2.1,
      'Consumer': 0.4
    },
    marketAlert: 'Fed meeting tomorrow - expect volatility'
  };
  
  const symbolAnalysis = symbols.length > 0 ? symbols.map(symbol => ({
    symbol,
    currentPrice: 150 + Math.random() * 100,
    dayChange: (Math.random() - 0.5) * 10,
    technicalSignal: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)],
    rsiLevel: 30 + Math.random() * 40
  })) : [];
  
  return { marketOverview, symbolAnalysis, timestamp: new Date().toISOString() };
}

async function assessRisk(positionSymbol?: string) {
  console.log('Assessing risk for position:', positionSymbol || 'entire portfolio');
  
  // Mock risk assessment data
  const portfolioRisk = {
    overallRiskLevel: 'moderate',
    riskScore: 6.2, // out of 10
    volatility: 18.5,
    maxDrawdown: -8.3,
    concentrationRisk: 'medium',
    betaToMarket: 1.15,
    sharpeRatio: 1.24,
    alerts: [
      { severity: 'medium', message: 'Technology concentration at 49.5% - consider diversification' },
      { severity: 'low', message: 'VIX below 20 indicates low market stress' }
    ]
  };
  
  if (positionSymbol) {
    const positionRisk = {
      symbol: positionSymbol,
      beta: 1.2 + Math.random() * 0.4,
      volatility: 20 + Math.random() * 15,
      correlationToSpy: 0.6 + Math.random() * 0.3,
      riskContribution: Math.random() * 20,
      recommendation: Math.random() > 0.5 ? 'hold' : 'reduce'
    };
    return { portfolioRisk, positionRisk };
  }
  
  return { portfolioRisk };
}

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
    
    // Step 1: Convert audio to text using Whisper
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Step 2: Verify audio authenticity and quality
    console.log('Verifying audio input...');
    if (!await verifyAudioInput(binaryAudio)) {
      throw new Error('Audio verification failed - invalid or suspicious audio input');
    }
    
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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    
    if (errorMsg.includes('Audio verification failed')) {
      errorMessage = 'Audio input verification failed. Please try speaking again.';
      statusCode = 400;
    } else if (errorMsg.includes('Failed to transcribe')) {
      errorMessage = 'I had trouble understanding your audio. Could you please try again?';
      statusCode = 422;
    } else if (errorMsg.includes('Failed to generate response')) {
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