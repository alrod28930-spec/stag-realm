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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[analyst-core-v2] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return json({ ok: false, error: "Server configuration error" }, 500);
    }

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
      policy_override_id = null,
    } = body;

    // Load feature flags
    const { data: featureFlags, error: ffError } = await supabase
      .from("agent_feature_flags")
      .select("flags")
      .eq("workspace_id", workspace_id)
      .single();

    if (ffError && ffError.code !== "PGRST116") {
      console.warn("[analyst-core-v2] feature flag load error:", ffError.message);
    }

    const mergedFlags = {
      ...flags,
      ...(featureFlags?.flags ?? {}),
      predictive_enabled: featureFlags?.flags?.predictive_enabled ?? true,
      size_boost_cap: featureFlags?.flags?.size_boost_cap ?? 0.003,
      size_cut_cap: featureFlags?.flags?.size_cut_cap ?? 0.005,
    };

    // Load tuned hyperparameters
    const { data: hparams, error: hpError } = await supabase
      .from("analyst_hparams")
      .select("params")
      .eq("workspace_id", workspace_id)
      .single();

    if (hpError && hpError.code !== "PGRST116") {
      console.warn("[analyst-core-v2] hparams load error:", hpError.message);
    }

    let params = hparams?.params ?? {
      w_win: 0.5,
      w_oracle: 0.5,
      risk_base: 0.02,
      risk_cap: 0.03,
    };

    // Apply policy override if provided
    let appliedPolicy: { id: string; name: string; status: string } | null = null;
    if (policy_override_id) {
      const policyOverride = await loadPolicyOverride(supabase, workspace_id, policy_override_id);
      if (policyOverride) {
        params = applyPolicyParams(params, policyOverride);
        appliedPolicy = {
          id: policyOverride.id,
          name: policyOverride.name,
          status: policyOverride.status,
        };

        const paramsHash = JSON.stringify(params);
        await logPolicyOverride(supabase, workspace_id, policy_override_id, paramsHash);

        console.log(
          `[analyst-core-v2] Applied policy override: ${policyOverride.name} (${policy_override_id})`,
        );
      } else {
        console.warn(
          `[analyst-core-v2] Policy override ${policy_override_id} not found or unauthorized`,
        );
      }
    }

    console.log(
      `[analyst-core-v2] workspace_id=${workspace_id}, user_id=${user_id}, tf=${tf}, policy=${
        appliedPolicy?.name || "default"
      }, predictive=${mergedFlags.predictive_enabled}`,
    );

    // 0. Load predictive scores if enabled
    let predictiveMap = new Map<string, any>();
    if (mergedFlags.predictive_enabled && candidates?.length) {
      const { data: predData, error: predError } = await supabase
        .from("oracle_predictive")
        .select("*")
        .eq("workspace_id", workspace_id)
        .in("symbol", candidates)
        .eq("tf", tf);

      if (predError) {
        console.warn("[analyst-core-v2] predictive load error:", predError.message);
      } else if (predData?.length) {
        predictiveMap = new Map(predData.map((r: any) => [r.symbol, r]));
        console.log(`[analyst-core-v2] Loaded ${predData.length} predictive scores`);
      }
    }

    // 1. Load user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.warn("[analyst-core-v2] profile load error:", profileError.message);
    }

    // 2. Load BID stats (user's historical performance)
    const { data: stats, error: statsError } = await supabase
      .from("bid_user_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .eq("tf", tf)
      .order("win_rate", { ascending: false })
      .limit(200);

    if (statsError) {
      console.warn("[analyst-core-v2] stats load error:", statsError.message);
    }

    // 3. Load Oracle top signals
    const { data: oracleTop, error: oracleError } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("tf", tf)
      .order("hit_rate", { ascending: false })
      .order("avg_edge_bp", { ascending: false })
      .limit(50);

    if (oracleError) {
      console.warn("[analyst-core-v2] oracle load error:", oracleError.message);
    }

    // 4. Deterministic selection & sizing
    const symbol = selectSymbol({
      profile,
      stats: stats || [],
      oracleTop: oracleTop || [],
      candidates,
    });
    const statsForSymbol = (stats || []).find((s) => s.symbol === symbol);
    const predictive = predictiveMap.get(symbol);
    const sizing = computeRisk({ profile, statsForSymbol, params, predictive, flags: mergedFlags });
    const stops = proposeStops({ tf, profile });

    const mode = mergedFlags.allow_live_trades ? "live" : "paper";

    const plan = {
      plan_version: "v2",
      mode,
      symbol,
      tf,
      side: "buy",
      entry_logic: `Deterministic engine: style=${
        profile?.style || "mixed"
      }, oracle=${oracleTop?.find((o) => o.symbol === symbol) ? "favorable" : "neutral"}, user_stats=${
        statsForSymbol ? "positive" : "new"
      }`,
      size_logic: sizing,
      stops,
      constraints: {
        max_daily_trades: profile?.max_daily_trades ?? 5,
        max_open_positions: 3,
      },
      confidence: confidenceScore({
        profile,
        stats: stats || [],
        oracleTop: oracleTop || [],
        symbol,
        params,
      }),
      notes: "Self-contained deterministic plan (no LLM). Pure BID + Oracle logic.",
    };

    const validation = validator(plan, mergedFlags);
    if (!validation.ok) {
      return json({ ok: false, error: "validation_failed", reasons: validation.errs }, 400);
    }

    const idem = idempotencyKey([
      workspace_id,
      symbol,
      tf,
      "buy",
      Math.floor(Date.now() / 60000),
    ]);

    await supabase.from("analyst_states").upsert(
      {
        workspace_id,
        user_id,
        last_plan: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id" },
    );

    await recordEvent(supabase, workspace_id, "analyst", {
      event: "plan_generated",
      plan,
      idem,
      validation,
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

// Helper functions

function selectSymbol({
  profile,
  stats,
  oracleTop,
  candidates,
}: {
  profile: any;
  stats: any[];
  oracleTop: any[];
  candidates: string[];
}): string {
  const pool = candidates?.length ? candidates : (oracleTop?.map((o) => o.symbol) ?? []);
  if (!pool?.length) return "SPY";

  const byUser = stats?.reduce((acc, s) => {
    acc[s.symbol] = s.win_rate || 0;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const byOracle = oracleTop?.reduce((acc, o) => {
    acc[o.symbol] = o.hit_rate || 0;
    return acc;
  }, {} as Record<string, number>) ?? {};

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
  params,
  predictive,
  flags,
}: {
  profile: any;
  statsForSymbol: any;
  params: any;
  predictive?: any;
  flags: any;
}): { risk_pct: number; qty_estimate: number } {
  const base = Math.min(
    profile?.max_position_risk_pct ?? params.risk_base,
    params.risk_base,
  );

  const statsBoost = statsForSymbol
    ? Math.max(0, (statsForSymbol.win_rate - 0.5) * 0.01)
    : 0;

  let risk_pct = Math.min(params.risk_cap, base + statsBoost);

  if (flags.predictive_enabled && predictive) {
    const p = predictive;
    if (p.score >= 0.8 && p.sentiment >= 0.2 && p.anomaly <= 0.2) {
      const boost = flags.size_boost_cap ?? 0.003;
      risk_pct = Math.min(risk_pct + boost, params.risk_cap);
      console.log(
        `[risk] Predictive boost: +${boost} (score=${p.score}, sent=${p.sentiment})`,
      );
    }

    if (p.anomaly >= 0.5 || p.sentiment <= -0.3) {
      const cut = flags.size_cut_cap ?? 0.005;
      risk_pct = Math.max(risk_pct - cut, 0.001);
      console.log(
        `[risk] Predictive cut: -${cut} (anom=${p.anomaly}, sent=${p.sentiment})`,
      );
    }
  }

  // Fixed: treat risk_pct as fraction (e.g., 0.02 → 200 units on 10k notional)
  const qty_estimate = Math.floor(10000 * risk_pct);

  return { risk_pct, qty_estimate };
}

function proposeStops({
  tf,
  profile,
}: {
  tf: string;
  profile: any;
}): { type: string; stop_loss: number; take_profit: number } {
  let sl = 0.014;
  let tp = 0.028;

  if (profile?.style === "trend") {
    sl = 0.020;
    tp = 0.060;
  } else if (profile?.style === "mean_reversion") {
    sl = 0.010;
    tp = 0.015;
  }

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
  params,
}: {
  profile: any;
  stats: any[];
  oracleTop: any[];
  symbol: string;
  params: any;
}): number {
  const userStat = stats?.find((s) => s.symbol === symbol);
  const oracleStat = oracleTop?.find((o) => o.symbol === symbol);

  // Fixed: add null/undefined checks to prevent NaN
  const win = userStat?.win_rate ?? 0.5;
  const rr = userStat?.avg_rr ?? 1;
  const edge = oracleStat?.avg_edge_bp ?? 1;
  const hit = oracleStat?.hit_rate ?? 0.5;

  const userConfidence = Math.min(1, win * rr / 2);
  const oracleConfidence = Math.min(1, hit * edge / 100);

  return Math.max(
    0,
    Math.min(1, userConfidence * params.w_win + oracleConfidence * params.w_oracle),
  );
}
