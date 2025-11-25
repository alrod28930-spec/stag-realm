import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { text, workspace_id, voice_opts = {} } = await req.json()
    if (!text) throw new Error('text required')

    // Check VOICE_ANALYST entitlement
    if (workspace_id) {
      const { data: hasEntitlement } = await supabaseClient.rpc('has_entitlement', {
        p_workspace: workspace_id,
        p_feature: 'VOICE_ANALYST'
      })

      if (!hasEntitlement) {
        return new Response(JSON.stringify({ 
          audio_url: null,
          error: 'LOCKED_FEATURE',
          feature: 'VOICE_ANALYST',
          required_tier: 'elite'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Check user voice preferences
    const { data: prefs } = await supabaseClient
      .from('user_prefs')
      .select('voice_enabled, voice_rate')
      .eq('user_id', user.id)
      .single()

    if (prefs && !prefs.voice_enabled) {
      return new Response(JSON.stringify({ 
        audio_url: null,
        message: 'Voice disabled by user preference'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log telemetry
    if (workspace_id) {
      await supabaseClient.from('analyst_telemetry').insert({
        workspace_id,
        user_id: user.id,
        event: 'tts_requested',
        payload: { text_length: text.length, voice_opts }
      })
    }

    // Generate TTS using OpenAI (sanitize key if pasted with header)
    const rawKey = (Deno.env.get('OPENAI_API_KEY') || '').trim();
    if (!rawKey) {
      throw new Error('OpenAI API key not configured');
    }
    const openaiKey = rawKey
      .replace(/^Authorization:\s*Bearer\s*/i, '')
      .replace(/^Bearer\s*/i, '')
      .replace(/^['\"]/g, '')
      .replace(/['\"]/g, '');

    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice_opts.voice || 'alloy',
        response_format: 'mp3',
        speed: prefs?.voice_rate || 1.0
      }),
    })

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json()
      throw new Error(error.error?.message || 'TTS generation failed')
    }

    // Convert audio to base64 for transmission
    const audioBuffer = await ttsResponse.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    // In a real implementation, you'd upload to storage and return a URL
    // For now, return the base64 data
    const response = {
      audio_url: `data:audio/mp3;base64,${base64Audio}`,
      duration_estimate: Math.ceil(text.length / 15), // ~15 chars per second
      voice: voice_opts.voice || 'alloy',
      timestamp: new Date().toISOString()
    }

    // Log successful TTS
    if (workspace_id) {
      await supabaseClient.from('analyst_telemetry').insert({
        workspace_id,
        user_id: user.id,
        event: 'tts_generated',
        payload: { 
          text_length: text.length, 
          voice: voice_opts.voice || 'alloy',
          duration_estimate: response.duration_estimate
        }
      })
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('TTS error:', error)
    return new Response(JSON.stringify({ 
      audio_url: null,
      error: error instanceof Error ? error.message : 'Failed to generate speech'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})