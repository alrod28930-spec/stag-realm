/**
 * Policy Runner - Phase V
 * Executes policies in 'shadow' or 'active' mode
 * Shadow = virtual fills only, Active = real execution
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { validator } from '../_shared/safety.ts';
import { circuitBreaker, positionLimitCheck } from '../_shared/execution.ts';

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

    const { symbols = [], tf = '1H', policy_id, mode = 'shadow' } = await req.json();
    
    if (!policy_id) throw new Error('Missing policy_id');

    // Fetch policy
    const { data: policy, error: policyErr } = await supabase
      .from('rl_policies')
      .select('*')
      .eq('id', policy_id)
      .eq('workspace_id', wsId)
      .single();
    
    if (policyErr || !policy) throw new Error('Policy not found');

    console.log(`[policy-runner] Running policy ${policy.name} in ${mode} mode`);

    const results = [];
    
    for (const symbol of symbols) {
      try {
        // Generate plan using analyst-core-v2 with policy params override
        const { data: planData, error: planErr } = await supabase.functions.invoke('analyst-core-v2', {
          body: {
            user_id: user.id,
            tf,
            candidates: [symbol],
            policy_params: policy.params
          }
        });

        if (planErr || !planData?.plan) {
          console.log(`No plan for ${symbol}:`, planErr);
          continue;
        }

        const plan = planData.plan;

        if (mode === 'shadow') {
          // Shadow mode: virtual fill
          const virtualFillPrice = plan.entry_logic?.trigger_price || 100;
          const qty = plan.size_logic?.qty_estimate || 10;
          const stopLoss = plan.stops?.stop_loss || 0.02;
          const takeProfit = plan.stops?.take_profit || 0.04;
          
          // Simulate fill and outcome (simplified)
          const outcome = Math.random() > 0.5 ? 'win' : 'loss';
          const pnl = outcome === 'win' 
            ? virtualFillPrice * qty * takeProfit 
            : -virtualFillPrice * qty * stopLoss;

          // Log shadow fill
          await supabase.from('repository_events').insert({
            workspace_id: wsId,
            source: 'shadow_fill',
            payload: {
              policy_id,
              symbol,
              tf,
              plan,
              virtualFillPrice,
              qty,
              outcome,
              pnl
            }
          });

          // Log to BID learning
          await supabase.from('bid_learning_events').insert({
            workspace_id: wsId,
            user_id: user.id,
            event_type: 'shadow_trade',
            symbol,
            tf,
            pnl,
            payload: { shadow: true, policy_id, plan }
          });

          results.push({ symbol, mode: 'shadow', outcome, pnl });

        } else {
          // Active mode: real execution
          const { data: flags } = await supabase
            .from('feature_flags')
            .select('flags')
            .eq('workspace_id', wsId)
            .single();

          // Validate
          const validation = validator(plan, flags?.flags || {});
          if (!validation.ok) {
            console.log(`Validation failed for ${symbol}:`, validation.errs);
            continue;
          }

          // Check circuit breaker and position limits
          const { data: riskCounter } = await supabase
            .from('risk_counters')
            .select('*')
            .eq('workspace_id', wsId)
            .eq('day', new Date().toISOString().split('T')[0])
            .single();

          if (riskCounter) {
            await circuitBreaker(supabase, wsId, riskCounter.total_pnl, 100000);
            await positionLimitCheck(supabase, wsId, 0.05);
          }

          // Would call broker API here (not implemented in shadow phase)
          console.log(`[policy-runner] Would execute LIVE order for ${symbol}`);
          
          results.push({ symbol, mode: 'active', status: 'would_execute' });
        }

      } catch (err: any) {
        console.error(`Error processing ${symbol}:`, err);
        results.push({ symbol, error: err.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[policy-runner] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
