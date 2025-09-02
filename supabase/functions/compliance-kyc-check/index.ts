import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { workspace_id, kyc_provider = 'mock' } = await req.json();

    console.log('Processing KYC check for user:', user.id, 'workspace:', workspace_id);

    // Mock KYC verification (replace with actual provider integration)
    const mockKycResult = {
      kyc_status: Math.random() > 0.1 ? 'verified' : 'pending',
      aml_status: Math.random() > 0.05 ? 'verified' : 'pending',
      accredited_investor: Math.random() > 0.7,
    };

    // Insert or update user verification record
    const { data, error } = await supabase
      .from('user_verifications')
      .upsert({
        user_id: user.id,
        workspace_id,
        kyc_status: mockKycResult.kyc_status,
        aml_status: mockKycResult.aml_status,
        accredited_investor: mockKycResult.accredited_investor,
        provider: kyc_provider,
        last_checked: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Log compliance event
    await supabase.rpc('recorder_log', {
      p_workspace: workspace_id,
      p_event_type: 'compliance.kyc.verified',
      p_severity: 1,
      p_entity_type: 'user',
      p_entity_id: user.id,
      p_summary: `KYC check completed with status: ${mockKycResult.kyc_status}`,
      p_payload: {
        kyc_status: mockKycResult.kyc_status,
        aml_status: mockKycResult.aml_status,
        provider: kyc_provider,
      },
    });

    // Flag suspicious activity if needed
    if (mockKycResult.kyc_status === 'pending' || mockKycResult.aml_status === 'pending') {
      await supabase
        .from('suspicious_activity')
        .insert({
          workspace_id,
          user_id: user.id,
          activity_type: 'kyc_pending',
          severity: 2,
          description: `KYC/AML verification pending for user ${user.email}`,
          status: 'open',
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      verification: data,
      message: 'KYC check completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance-kyc-check:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});