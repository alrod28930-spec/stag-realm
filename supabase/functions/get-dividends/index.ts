import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { symbol, workspace_id } = await req.json();

    if (!symbol || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: symbol, workspace_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, check for workspace-specific overrides
    const { data: override } = await supabase
      .from('div_overrides')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('symbol', symbol)
      .single();

    // If no override, get from reference data
    if (!override) {
      const { data: refData, error } = await supabase
        .from('div_ref')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching dividend data:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch dividend data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          data: refData || { 
            symbol, 
            adps: 0, 
            frequency: 'Q', 
            ex_date: null, 
            pay_date: null 
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge override with reference data
    const { data: refData } = await supabase
      .from('div_ref')
      .select('*')
      .eq('symbol', symbol)
      .single();

    const mergedData = {
      symbol,
      adps: override.adps ?? refData?.adps ?? 0,
      frequency: override.frequency ?? refData?.frequency ?? 'Q',
      growth_rate: override.growth_rate ?? 0,
      ex_date: refData?.ex_date ?? null,
      pay_date: refData?.pay_date ?? null,
    };

    return new Response(
      JSON.stringify({ data: mergedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-dividends function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});