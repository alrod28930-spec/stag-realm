import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { validator, idempotencyKey } from "../_shared/safety.ts";
import { recordEvent } from "../_shared/metrics.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadPolicyOverride, applyPolicyParams, logPolicyOverride } from "../_shared/override.ts";

/**
 * Analyst Core v2 - Deterministic Planning Engine
 * Self-contained decision engine with state tracking and personality
 * No LLM calls - pure rule-based logic using profile + BID + Oracle
 */

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const workspace_id = await ensureWorkspace(supabase);
    
    const body = await req.json().catch(() => ({}));
    const { 
      user_id = workspace_id, 
      tf = "1H", 
      candidates = [], 
      flags = { paper_only: true, allow_live_trades: false },
      policy_override_id = null
    } = body;

    // Load feature flags
    const { data: featureFlags } = await supabase
      .from("agent_feature_flags")
      .select("flags")
      .eq("workspace_id", workspace_id)
      .single();

    const mergedFlags = { ...flags, ...(featureFlags?.flags ?? {}) };

    // Load tuned hyperparameters
    const { data: hparams } = await supabase
      .from("analyst_hparams")
      .select("params")
      .eq("workspace_id", workspace_id)
      .single();

    let params = hparams?.params ?? { w_win: 0.5, w_oracle: 0.5, risk_base: 0.02, risk_cap: 0.03 };

    // Apply policy override if provided
    let appliedPolicy = null;
    if (policy_override_id) {
      const policyOverride = await loadPolicyOverride(supabase, workspace_id, policy_override_id);
      if (policyOverride) {
        params = applyPolicyParams(params, policyOverride);
        appliedPolicy = { id: policyOverride.id, name: policyOverride.name, status: policyOverride.status };
        
        // Log the override usage
        const paramsHash = JSON.stringify(params);
        await logPolicyOverride(supabase, workspace_id, policy_override_id, paramsHash);
        
        console.log(`[analyst-core-v2] Applied policy override: ${policyOverride.name} (${policy_override_id})`);
      } else {
        console.warn(`[analyst-core-v2] Policy override ${policy_override_id} not found or unauthorized`);
      }
    }

    console.log(`[analyst-core-v2] workspace_id=${workspace_id}, user_id=${user_id}, tf=${tf}, policy=${appliedPolicy?.name || 'default'}`);

    // 1. Load user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .single();

    // 2. Load BID stats (user's historical performance)
    const { data: stats } = await supabase
      .from("bid_user_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .eq("tf", tf)
      .order("win_rate", { ascending: false })
      .limit(200);

    // 3. Load Oracle top signals
    const { data: oracleTop } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("tf", tf)
      .order("hit_rate", { ascending: false })
      .order("avg_edge_bp", { ascending: false })
      .limit(50);

    // 4. Deterministic selection & sizing (with tuned params)
    const symbol = selectSymbol({ profile, stats: stats || [], oracleTop: oracleTop || [], candidates });
    const statsForSymbol = stats?.find((s) => s.symbol === symbol);
    const sizing = computeRisk({ profile, statsForSymbol, params });
    const stops = proposeStops({ tf, profile });

    // 5. Determine mode (paper by default unless explicitly allowed)
    const mode = mergedFlags.allow_live_trades ? "live" : "paper";

    // 6. Build plan
    const plan = {
      plan_version: "v2",
      mode,
      symbol,
      tf,
      side: "buy", // Simplified; can enhance with directional logic
      entry_logic: `Deterministic engine: style=${profile?.style || "mixed"}, oracle=${oracleTop?.find(o => o.symbol === symbol) ? "favorable" : "neutral"}, user_stats=${statsForSymbol ? "positive" : "new"}`,
      size_logic: sizing,
      stops,
      constraints: {
        max_daily_trades: profile?.max_daily_trades ?? 5,
        max_open_positions: 3,
      },
      confidence: confidenceScore({ profile, stats: stats || [], oracleTop: oracleTop || [], symbol, params }),
      notes: "Self-contained deterministic plan (no LLM). Pure BID + Oracle logic.",
    };

    // 6b. Validate plan
    const validation = validator(plan, mergedFlags);
    if (!validation.ok) {
      return json({ ok: false, error: "validation_failed", reasons: validation.errs }, 400);
    }

    // 6c. Generate idempotency key
    const idem = idempotencyKey([workspace_id, symbol, tf, "buy", Math.floor(Date.now() / 60000)]);

    // 7. Save state to analyst_states
    await supabase.from("analyst_states").upsert({
      workspace_id,
      user_id,
      last_plan: plan,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,user_id" });

    // 8. Log to repository_events
    await recordEvent(supabase, workspace_id, "analyst", { 
      event: "plan_generated", 
      plan, 
      idem,
      validation 
    });

    return json({
      ok: true,
      plan,
      applied_policy: appliedPolicy,
      metadata: {
        profile,
        stats_count: stats?.length ?? 0,
        oracle_count: oracleTop?.length ?? 0,
      },
    });
  } catch (err) {
    console.error("[analyst-core-v2] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

// Helper functions (deterministic logic)

function selectSymbol({ 
  profile, 
  stats, 
  oracleTop, 
  candidates 
}: {
  profile: any;
  stats: any[];
  oracleTop: any[];
  candidates: string[];
}): string {
  // Build symbol pool from candidates or oracle top
  const pool = candidates?.length ? candidates : (oracleTop?.map((o) => o.symbol) ?? []);
  if (!pool?.length) return "SPY";

  // Rank by user stats (win_rate) and oracle scores
  const byUser = stats?.reduce((acc, s) => {
    acc[s.symbol] = s.win_rate || 0;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const byOracle = oracleTop?.reduce((acc, o) => {
    acc[o.symbol] = o.hit_rate || 0;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Combine scores: 60% user stats, 40% oracle
  const ranked = [...new Set(pool)];
  ranked.sort((a, b) => {
    const scoreA = (byUser[a] || 0) * 0.6 + (byOracle[a] || 0) * 0.4;
    const scoreB = (byUser[b] || 0) * 0.6 + (byOracle[b] || 0) * 0.4;
    return scoreB - scoreA;
  });

  return ranked[0];
}

function computeRisk({ 
  profile, 
  statsForSymbol,
  params 
}: { 
  profile: any; 
  statsForSymbol: any;
  params: any;
}): { risk_pct: number; qty_estimate: number } {
  const base = Math.min(profile?.max_position_risk_pct ?? params.risk_base, params.risk_base);
  
  // Boost risk if user has positive stats for this symbol
  const boost = statsForSymbol 
    ? Math.max(0, (statsForSymbol.win_rate - 0.5) * 0.01)
    : 0;
  
  const risk_pct = Math.min(params.risk_cap, base + boost);
  
  // Simple qty estimate (placeholder)
  const qty_estimate = Math.floor(10000 * risk_pct / 100);
  
  return { risk_pct, qty_estimate };
}

function proposeStops({ 
  tf, 
  profile 
}: { 
  tf: string;
  profile: any;
}): { type: string; stop_loss: number; take_profit: number } {
  // Base stops
  let sl = 0.014; // 1.4%
  let tp = 0.028; // 2.8% (2:1 RR)

  // Adjust based on style
  if (profile?.style === "trend") {
    sl = 0.020;
    tp = 0.060; // 3:1 RR
  } else if (profile?.style === "mean_reversion") {
    sl = 0.010;
    tp = 0.015; // 1.5:1 RR
  }

  // Adjust based on timeframe
  if (tf === "1m" || tf === "5m") {
    sl *= 0.6;
    tp *= 0.6;
  } else if (tf === "1D" || tf === "1W") {
    sl *= 1.5;
    tp *= 1.5;
  }

  return { type: "percent", stop_loss: sl, take_profit: tp };
}

function confidenceScore({ 
  profile, 
  stats, 
  oracleTop, 
  symbol,
  params 
}: {
  profile: any;
  stats: any[];
  oracleTop: any[];
  symbol: string;
  params: any;
}): number {
  const userStat = stats?.find((s) => s.symbol === symbol);
  const oracleStat = oracleTop?.find((o) => o.symbol === symbol);

  const userConfidence = userStat 
    ? Math.min(1, userStat.win_rate * userStat.avg_rr / 2)
    : 0.5;
  
  const oracleConfidence = oracleStat
    ? Math.min(1, oracleStat.hit_rate * oracleStat.avg_edge_bp / 100)
    : 0.5;

  // Weighted average using tuned params
  return Math.max(0, Math.min(1, userConfidence * params.w_win + oracleConfidence * params.w_oracle));
}
