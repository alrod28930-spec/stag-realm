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

    const { workspace_id, report_type, period_start, period_end } = await req.json();

    console.log('Generating report:', { workspace_id, report_type, period_start, period_end });

    // Create report record
    const { data: reportRecord, error: reportError } = await supabase
      .from('regulatory_reports')
      .insert({
        workspace_id,
        report_type,
        period_start,
        period_end,
        created_by: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report record:', reportError);
      throw reportError;
    }

    // Generate report data based on type
    let reportData = [];
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);

    switch (report_type) {
      case 'trade_blotter':
        const { data: trades } = await supabase
          .from('rec_events')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('event_type', 'trade.executed')
          .gte('ts', startDate.toISOString())
          .lte('ts', endDate.toISOString());
        reportData = trades || [];
        break;

      case 'position_report':
        const { data: positions } = await supabase
          .from('positions_current')
          .select('*')
          .eq('workspace_id', workspace_id);
        reportData = positions || [];
        break;

      case 'sar':
        const { data: suspicious } = await supabase
          .from('suspicious_activity')
          .select('*')
          .eq('workspace_id', workspace_id)
          .gte('ts', startDate.toISOString())
          .lte('ts', endDate.toISOString());
        reportData = suspicious || [];
        break;

      case 'communications_archive':
        const { data: comms } = await supabase
          .from('rec_events')
          .select('*')
          .eq('workspace_id', workspace_id)
          .in('event_type', ['analyst.query', 'oracle.signal'])
          .gte('ts', startDate.toISOString())
          .lte('ts', endDate.toISOString());
        reportData = comms || [];
        break;

      default:
        throw new Error(`Unknown report type: ${report_type}`);
    }

    // Generate CSV content
    if (reportData.length === 0) {
      throw new Error('No data found for the specified period');
    }

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(','))
    ].join('\n');

    // In a real implementation, you would upload this to storage
    // For now, we'll just simulate the file path
    const filePath = `reports/${workspace_id}/${report_type}_${period_start}_${period_end}.csv`;

    // Update report status
    await supabase
      .from('regulatory_reports')
      .update({
        status: 'ready',
        file_path: filePath,
      })
      .eq('id', reportRecord.id);

    // Log compliance event
    await supabase.rpc('recorder_log', {
      p_workspace: workspace_id,
      p_event_type: 'compliance.report.generated',
      p_severity: 1,
      p_entity_type: 'report',
      p_entity_id: reportRecord.id,
      p_summary: `Generated ${report_type} report for period ${period_start} to ${period_end}`,
      p_payload: {
        report_type,
        period_start,
        period_end,
        record_count: reportData.length,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      report: {
        id: reportRecord.id,
        type: report_type,
        status: 'ready',
        file_path: filePath,
        record_count: reportData.length,
      },
      // Return CSV content for download (in production, return download URL)
      csv_content: csvContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance-generate-report:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});