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

    console.log('Starting compliance data cleanup...');

    const now = new Date().toISOString();
    let totalCleaned = 0;

    // Clean expired records from rec_events
    const { data: expiredEvents, error: eventsError } = await supabase
      .from('rec_events')
      .delete()
      .lt('retention_until', now)
      .select('count');

    if (eventsError) {
      console.error('Error cleaning rec_events:', eventsError);
    } else {
      console.log(`Cleaned ${expiredEvents?.length || 0} expired events`);
      totalCleaned += expiredEvents?.length || 0;
    }

    // Clean expired records from analyst_outputs
    const { data: expiredOutputs, error: outputsError } = await supabase
      .from('analyst_outputs')
      .delete()
      .lt('retention_until', now)
      .select('count');

    if (outputsError) {
      console.error('Error cleaning analyst_outputs:', outputsError);
    } else {
      console.log(`Cleaned ${expiredOutputs?.length || 0} expired analyst outputs`);
      totalCleaned += expiredOutputs?.length || 0;
    }

    // Clean old acknowledgments (keep for 10 years as they're legal records)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const { data: expiredAcks, error: acksError } = await supabase
      .from('compliance_acknowledgments')
      .delete()
      .lt('acknowledged_at', tenYearsAgo.toISOString())
      .select('count');

    if (acksError) {
      console.error('Error cleaning compliance_acknowledgments:', acksError);
    } else {
      console.log(`Cleaned ${expiredAcks?.length || 0} expired acknowledgments`);
      totalCleaned += expiredAcks?.length || 0;
    }

    // Clean resolved suspicious activities older than 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data: expiredSuspicious, error: suspiciousError } = await supabase
      .from('suspicious_activity')
      .delete()
      .eq('status', 'closed')
      .lt('ts', threeYearsAgo.toISOString())
      .select('count');

    if (suspiciousError) {
      console.error('Error cleaning suspicious_activity:', suspiciousError);
    } else {
      console.log(`Cleaned ${expiredSuspicious?.length || 0} old resolved suspicious activities`);
      totalCleaned += expiredSuspicious?.length || 0;
    }

    // Log cleanup operation
    await supabase
      .from('rec_events')
      .insert({
        workspace_id: null, // System-level operation
        event_type: 'system.cleanup.completed',
        severity: 1,
        entity_type: 'system',
        entity_id: 'compliance-cleanup',
        summary: `Compliance data cleanup completed, removed ${totalCleaned} records`,
        payload_json: {
          records_cleaned: totalCleaned,
          cleanup_time: now,
        },
      });

    return new Response(JSON.stringify({
      success: true,
      message: `Cleanup completed successfully. Removed ${totalCleaned} expired records.`,
      details: {
        events_cleaned: expiredEvents?.length || 0,
        outputs_cleaned: expiredOutputs?.length || 0,
        acknowledgments_cleaned: expiredAcks?.length || 0,
        suspicious_cleaned: expiredSuspicious?.length || 0,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance-cleanup:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
