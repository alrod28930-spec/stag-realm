/**
 * A/B Evaluate - Phase V
 * Compares baseline vs candidate policy performance and recommends promotion
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: wm } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();
    if (!wm) throw new Error('No workspace');
    const wsId = wm.workspace_id;

    const { experiment_id } = await req.json();
    if (!experiment_id) throw new Error('Missing experiment_id');

    // Fetch experiment
    const { data: experiment, error: expErr } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experiment_id)
      .eq('workspace_id', wsId)
      .single();

    if (expErr || !experiment) throw new Error('Experiment not found');

    console.log(`[ab-evaluate] Evaluating experiment: ${experiment.name}`);

    // Fetch feature flags
    const { data: flagsData } = await supabase
      .from('feature_flags')
      .select('flags')
      .eq('workspace_id', wsId)
      .single();

    const flags = flagsData?.flags || {};
    const minSamples = flags.min_shadow_samples || 50;
    const promoteThreshold = flags.promote_threshold || 0.58;

    // Fetch results for both policies
    const { data: resultsA, error: errA } = await supabase
      .from('rl_policy_results')
      .select('*')
      .eq('policy_id', experiment.a_policy_id)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: resultsB, error: errB } = await supabase
      .from('rl_policy_results')
      .select('*')
      .eq('policy_id', experiment.b_policy_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (errA || errB || !resultsA || !resultsB) {
      throw new Error('Failed to fetch policy results');
    }

    if (resultsB.length < minSamples) {
      console.log(`Insufficient samples for B (${resultsB.length} < ${minSamples})`);
      return new Response(JSON.stringify({
        ok: true,
        recommend: false,
        reason: `Insufficient samples: ${resultsB.length}/${minSamples}`,
        scoreA: null,
        scoreB: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute metrics for A
    const metricsA = computeMetrics(resultsA);
    // Compute metrics for B
    const metricsB = computeMetrics(resultsB);

    // Combined score: 0.3*WR + 0.3*RR + 0.2*Sharpe + 0.2*(1-downside)
    const scoreA = computeCombinedScore(metricsA);
    const scoreB = computeCombinedScore(metricsB);

    console.log(`Score A (${experiment.a_policy_id}): ${scoreA.toFixed(3)}`);
    console.log(`Score B (${experiment.b_policy_id}): ${scoreB.toFixed(3)}`);

    const recommend = scoreB >= promoteThreshold && scoreB > scoreA;

    const response = {
      ok: true,
      recommend,
      reason: recommend 
        ? `B outperforms A: ${scoreB.toFixed(3)} > ${scoreA.toFixed(3)} (threshold: ${promoteThreshold})`
        : `B does not meet criteria: ${scoreB.toFixed(3)} vs A: ${scoreA.toFixed(3)}`,
      scoreA,
      scoreB,
      metricsA,
      metricsB
    };

    // If AUTO_PROMOTE=true and recommend, promote automatically (default: false)
    const autoPromote = Deno.env.get('AUTO_PROMOTE') === 'true';
    if (recommend && autoPromote) {
      await supabase
        .from('ab_experiments')
        .update({ status: 'promoted', stopped_at: new Date().toISOString() })
        .eq('id', experiment_id);

      await supabase
        .from('rl_policies')
        .update({ status: 'active' })
        .eq('id', experiment.b_policy_id);

      await supabase
        .from('rl_policies')
        .update({ status: 'archived' })
        .eq('id', experiment.a_policy_id);

      console.log('[ab-evaluate] Auto-promoted candidate policy');
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ab-evaluate] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function computeMetrics(results: any[]) {
  if (results.length === 0) {
    return { winRate: 0, avgRR: 0, sharpe: 0, downside: 0 };
  }

  const winRate = results.reduce((sum, r) => sum + Number(r.win_rate), 0) / results.length;
  const avgRR = results.reduce((sum, r) => sum + Number(r.avg_rr), 0) / results.length;
  const sharpe = results.reduce((sum, r) => sum + (Number(r.sharpe) || 0), 0) / results.length;

  // Downside deviation (simplified: std of negative returns)
  const pnls = results.map(r => Number(r.pnl_bp));
  const negativePnls = pnls.filter(p => p < 0);
  const downside = negativePnls.length > 0
    ? Math.sqrt(negativePnls.reduce((sum, p) => sum + p * p, 0) / negativePnls.length)
    : 0;

  return { winRate, avgRR, sharpe, downside };
}

function computeCombinedScore(metrics: any): number {
  const normalizedSharpe = Math.max(0, Math.min(1, metrics.sharpe / 3));
  const normalizedDownside = metrics.downside > 0 ? Math.max(0, 1 - metrics.downside / 100) : 1;
  
  return 0.3 * metrics.winRate 
       + 0.3 * Math.min(1, metrics.avgRR / 3) 
       + 0.2 * normalizedSharpe 
       + 0.2 * normalizedDownside;
}
