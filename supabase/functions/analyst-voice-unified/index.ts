import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simplified voice processing - combines transcription, analysis, and TTS in one function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const { audio, personality = 'mentor_male', workspace_id } = await req.json()
    if (!audio) throw new Error('Audio data required')

    console.log('Processing unified voice request:', { userId: user.id, personality, audioLength: audio.length })

    // Sanitize OpenAI API key thoroughly
    let openaiKey = (Deno.env.get('OPENAI_API_KEY') || '').trim()
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')
    
    openaiKey = openaiKey
      .replace(/^Authorization:\s*Bearer\s*/i, '')
      .replace(/^Bearer\s*/i, '')
      .replace(/^["']/g, '')
      .replace(/["']$/g, '')
      .replace(/\s/g, '')
    
    if (!openaiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format')
    }

    // Process base64 audio in chunks to prevent memory issues
    function processBase64Chunks(base64String: string, chunkSize = 32768) {
      const chunks: Uint8Array[] = []
      let position = 0
      
      while (position < base64String.length) {
        const chunk = base64String.slice(position, position + chunkSize)
        const binaryChunk = atob(chunk)
        const bytes = new Uint8Array(binaryChunk.length)
        
        for (let i = 0; i < binaryChunk.length; i++) {
          bytes[i] = binaryChunk.charCodeAt(i)
        }
        
        chunks.push(bytes)
        position += chunkSize
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0

      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      return result
    }

    // STEP 1: Transcribe audio to text
    console.log('Step 1: Transcribing audio...')
    const binaryAudio = processBase64Chunks(audio)
    
    const formData = new FormData()
    const blob = new Blob([binaryAudio], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text()
      console.error('Transcription error:', errorText)
      throw new Error(`Voice transcription failed: ${errorText}`)
    }

    const transcriptionResult = await transcriptionResponse.json()
    const transcribedText = transcriptionResult.text

    if (!transcribedText?.trim()) {
      throw new Error('No speech detected. Please speak clearly and try again.')
    }

    console.log('Transcription successful:', transcribedText.substring(0, 100) + '...')

    // STEP 2: Get user context from BID
    console.log('Step 2: Gathering user context...')
    const { data: userBIDProfile } = await supabaseClient
      .from('user_bid_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspace_id || null)
      .maybeSingle()

    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const isDemoMode = userProfile?.display_name === 'Demo User' || false

    // Generate context for analyst
    const portfolioData = isDemoMode ? {
      totalEquity: 100000,
      availableCash: 20000,
      positions: [
        { symbol: 'AAPL', allocation: 15, unrealizedPnL: 2400 },
        { symbol: 'MSFT', allocation: 18, unrealizedPnL: 3200 },
        { symbol: 'GOOGL', allocation: 12, unrealizedPnL: 1800 }
      ]
    } : (userBIDProfile?.profile_data?.portfolio || { totalEquity: 0, availableCash: 0, positions: [] })

    // STEP 3: Generate analyst response
    console.log('Step 3: Generating analyst response...')
    const personalityVoices = {
      'mentor_male': { voice: 'onyx', name: 'Marcus (Mentor)' },
      'coach_male': { voice: 'echo', name: 'Jake (Coach)' }, 
      'analyst_male': { voice: 'alloy', name: 'David (Analyst)' },
      'mentor_female': { voice: 'nova', name: 'Sofia (Mentor)' },
      'coach_female': { voice: 'shimmer', name: 'Emma (Coach)' },
      'analyst_female': { voice: 'coral', name: 'Victoria (Analyst)' },
    }
    
    const personalityConfig = personalityVoices[personality as keyof typeof personalityVoices] || personalityVoices.mentor_male

    const systemPrompt = `You are ${personalityConfig.name}, a sophisticated financial analyst for the StagAlgo trading platform.

CURRENT USER CONTEXT:
- Demo Mode: ${isDemoMode ? 'Yes (Learning Environment)' : 'No'}
- Portfolio Value: $${portfolioData.totalEquity?.toLocaleString() || '0'}
- Available Cash: $${portfolioData.availableCash?.toLocaleString() || '0'}
- Positions: ${portfolioData.positions?.length || 0}

RESPONSE GUIDELINES:
- Keep responses conversational and under 45 seconds of speech
- Provide actionable insights based on their portfolio
- ${isDemoMode ? 'Explain this is demo data for educational purposes' : 'Use real portfolio data for analysis'}
- Be encouraging and educational
- Always mention relevant risks
- Ask follow-up questions when appropriate

USER QUESTION: "${transcribedText}"`

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcribedText }
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
    })

    if (!analysisResponse.ok) {
      const error = await analysisResponse.json()
      throw new Error(`Analysis failed: ${error.error?.message || 'Unknown error'}`)
    }

    const analysisResult = await analysisResponse.json()
    const analystResponse = analysisResult.choices[0].message.content

    console.log('Analysis successful:', analystResponse.substring(0, 100) + '...')

    // STEP 4: Convert response to speech
    console.log('Step 4: Converting to speech...')
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: analystResponse,
        voice: personalityConfig.voice,
        response_format: 'mp3',
        speed: 1.0
      }),
    })

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json()
      throw new Error(`Speech generation failed: ${error.error?.message || 'Unknown error'}`)
    }

    // Convert audio to base64
    const audioBuffer = await ttsResponse.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    // STEP 5: Log interaction for compliance
    await supabaseClient
      .from('analyst_outputs')
      .insert({
        workspace_id: workspace_id,
        input_json: {
          transcribedText,
          personality,
          portfolioContext: {
            value: portfolioData.totalEquity,
            positions: portfolioData.positions?.length || 0
          }
        },
        output_text: analystResponse,
        model: 'gpt-4o-voice-unified',
        input_kind: 'voice_unified'
      })

    console.log('Voice processing completed successfully')

    return new Response(JSON.stringify({
      success: true,
      transcription: transcribedText,
      response: analystResponse,
      audio_url: `data:audio/mp3;base64,${base64Audio}`,
      personality: personalityConfig.name,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unified voice processing error:', error)
    
    // Provide specific error messages
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    let errorMessage = 'Voice processing failed'
    if (errorMsg.includes('invalid_api_key')) {
      errorMessage = 'OpenAI API key is invalid. Please check configuration.'
    } else if (errorMsg.includes('No speech detected')) {
      errorMessage = 'No speech detected. Please speak clearly and try again.'
    } else if (errorMsg.includes('transcription')) {
      errorMessage = 'Could not understand audio. Please try speaking again.'
    } else if (errorMsg.includes('Analysis failed')) {
      errorMessage = 'Analysis temporarily unavailable. Please try again.'
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorMsg,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})