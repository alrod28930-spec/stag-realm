/**
 * RL Policy Improvement - Phase V
 * Bandit-style parameter tuning based on recent performance
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

    console.log('[rl-policy-improve] Starting policy improvement');

    // Get all active and shadow policies
    const { data: policies, error: policiesErr } = await supabase
      .from('rl_policies')
      .select('*')
      .eq('workspace_id', wsId)
      .in('status', ['active', 'shadow']);

    if (policiesErr || !policies || policies.length === 0) {
      console.log('No policies to improve');
      return new Response(JSON.stringify({ ok: true, message: 'No policies to improve' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const improvements = [];

    for (const policy of policies) {
      try {
        // Fetch recent results
        const { data: results, error: resultsErr } = await supabase
          .from('rl_policy_results')
          .select('*')
          .eq('policy_id', policy.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (resultsErr || !results || results.length < 3) {
          console.log(`Insufficient data for policy ${policy.id}`);
          continue;
        }

        // Compute objective: 0.5 * win_rate + 0.5 * sharpe (normalized)
        const avgWinRate = results.reduce((sum: number, r: any) => sum + Number(r.win_rate), 0) / results.length;
        const avgSharpe = results.reduce((sum: number, r: any) => sum + (Number(r.sharpe) || 0), 0) / results.length;
        const normalizedSharpe = Math.max(0, Math.min(1, avgSharpe / 3)); // Assume Sharpe ~3 is max
        const objective = 0.5 * avgWinRate + 0.5 * normalizedSharpe;

        console.log(`Policy ${policy.name}: objective=${objective.toFixed(3)}, WR=${avgWinRate.toFixed(3)}, Sharpe=${avgSharpe.toFixed(2)}`);

        // Determine improvement direction
        const params = policy.params || {};
        const newParams = { ...params };

        // Adjust risk_pct (0.01 to 0.03)
        const currentRisk = params.risk_pct || 0.02;
        if (objective > 0.6) {
          // Good performance, increase risk slightly
          newParams.risk_pct = Math.min(0.03, currentRisk + 0.002);
        } else if (objective < 0.4) {
          // Poor performance, decrease risk
          newParams.risk_pct = Math.max(0.01, currentRisk - 0.002);
        }

        // Adjust stop_loss (0.01 to 0.05)
        const currentSL = params.stop_loss || 0.02;
        if (avgWinRate < 0.4) {
          // Low win rate, widen stops
          newParams.stop_loss = Math.min(0.05, currentSL + 0.005);
        } else if (avgWinRate > 0.6) {
          // High win rate, tighten stops
          newParams.stop_loss = Math.max(0.01, currentSL - 0.005);
        }

        // Adjust take_profit (maintain risk-reward ratio)
        const rrTarget = 2.0;
        newParams.take_profit = newParams.stop_loss * rrTarget;

        // Adjust oracle weights (if present)
        if (params.oracle_weights) {
          // Apply softmax-like rebalancing (placeholder)
          newParams.oracle_weights = { ...params.oracle_weights };
        }

        // Create new candidate policy
        const candidateName = `${policy.name}_improved_${Date.now()}`;
        const { data: newPolicy, error: insertErr } = await supabase
          .from('rl_policies')
          .insert({
            workspace_id: wsId,
            name: candidateName,
            params: { ...newParams, parent_policy_id: policy.id },
            status: 'candidate'
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Failed to create candidate:', insertErr);
          continue;
        }

        // Run offline sim for new candidate
        const { data: simData, error: simErr } = await supabase.functions.invoke('offline-sim', {
          body: {
            symbol: 'SPY',
            tf: '1H',
            fromISO: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            toISO: new Date().toISOString(),
            policy_id: newPolicy.id
          }
        });

        if (simErr) {
          console.error('Offline sim failed:', simErr);
        } else {
          console.log(`Created candidate ${candidateName} with backtest result:`, simData);
        }

        improvements.push({
          original: policy.name,
          candidate: candidateName,
          objective,
          params: newParams
        });

      } catch (err: any) {
        console.error(`Error improving policy ${policy.id}:`, err);
      }
    }

    console.log(`[rl-policy-improve] Created ${improvements.length} candidate policies`);

    return new Response(JSON.stringify({ ok: true, improvements }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[rl-policy-improve] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
