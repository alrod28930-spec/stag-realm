import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmbedRequest {
  text: string;
  action: 'embed';
}

interface SearchRequest {
  query: string;
  action: 'search';
  limit?: number;
}

type RequestBody = EmbedRequest | SearchRequest;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    
    if (body.action === 'embed') {
      // Generate embedding for text
      const embedding = await generateEmbedding(body.text);
      
      return new Response(JSON.stringify({ embedding }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (body.action === 'search') {
      // Perform semantic search
      const results = await performSemanticSearch(body.query, body.limit || 5);
      
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in kb-embeddings function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit input length
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function performSemanticSearch(query: string, limit: number) {
  console.log(`Performing semantic search for: "${query}" with limit: ${limit}`);
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Search for similar chunks using cosine similarity
  const { data, error } = await supabase.rpc('match_kb_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7, // Minimum similarity threshold
    match_count: limit
  });

  if (error) {
    console.error('Error in semantic search:', error);
    // Fallback to text search
    const fallbackResults = await supabase
      .from('kb_chunks')
      .select(`
        *,
        document:kb_documents(
          *,
          source:kb_sources(*)
        )
      `)
      .ilike('content', `%${query}%`)
      .limit(limit);
    
    return fallbackResults.data || [];
  }

  return data || [];
}