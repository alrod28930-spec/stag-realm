import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Analyst Core v1 - Deterministic Planning Engine
 * No LLM calls - pure rule-based logic using BID + Oracle data
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

    // Parse request
    const body = await req.json();
    const { workspace_id: providedWsId, user_id, tf = "1H", candidates, flags = {} } = body;

    // Ensure workspace
    const workspace_id = providedWsId || await ensureWorkspace(supabase);

    console.log(`[analyst-core] workspace_id=${workspace_id}, tf=${tf}`);

    // 1. Load user profile
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id || workspace_id)
      .limit(1);

    const profile = profiles?.[0] || {
      risk_level: "balanced",
      style: "mixed",
      max_daily_trades: 5,
      max_position_risk_pct: 0.02,
      objectives: {},
    };

    // 2. Load BID user stats (top performing symbols for user)
    const { data: bidStats } = await supabase
      .from("bid_user_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id || workspace_id)
      .eq("tf", tf)
      .order("win_rate", { ascending: false })
      .limit(20);

    // 3. Load Oracle scores (top signals for timeframe)
    const { data: oracleScores } = await supabase
      .from("oracle_signal_scores")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("tf", tf)
      .order("hit_rate", { ascending: false })
      .order("avg_edge_bp", { ascending: false })
      .limit(20);

    // 4. Select symbol using deterministic logic
    const symbol = selectSymbol(profile, bidStats || [], oracleScores || [], candidates);

    // 5. Get BID stats for selected symbol
    const bidStatsForSymbol = bidStats?.find((s) => s.symbol === symbol);
    const oracleScoreForSymbol = oracleScores?.find((s) => s.symbol === symbol);

    // 6. Calculate risk sizing
    const sizeLogic = computeRisk(profile, bidStatsForSymbol);

    // 7. Propose stops
    const stops = proposeStops(symbol, tf, profile);

    // 8. Build plan
    const plan = {
      plan_version: "v1",
      mode: flags.allow_live_trades ? "live" : "paper",
      symbol,
      tf,
      side: "buy", // Simplified - could enhance with directional logic
      entry_logic: `Deterministic: style=${profile.style}, oracle_score=${oracleScoreForSymbol?.hit_rate.toFixed(2) || "N/A"}, user_stats=${bidStatsForSymbol ? "favorable" : "new"}`,
      size_logic: sizeLogic,
      stops,
      constraints: {
        max_daily_trades: profile.max_daily_trades,
        max_open_positions: 3, // Default
      },
      confidence: calculateConfidence(bidStatsForSymbol, oracleScoreForSymbol, profile),
      notes: "No LLM used; deterministic plan from profile/BID/Oracle",
    };

    // 9. Pre-validate
    // Query current positions count and today's trades (simplified for now)
    const currentPositionsCount = 0; // TODO: Query actual positions
    const todayTradesCount = 0; // TODO: Query today's trades

    const validation = preValidate(plan, flags, currentPositionsCount, todayTradesCount);

    return json({
      ok: true,
      plan,
      validation,
      metadata: {
        profile,
        bid_stats: bidStatsForSymbol,
        oracle_score: oracleScoreForSymbol,
      },
    });
  } catch (err) {
    console.error("[analyst-core] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

// Helper functions (inline for edge function)
function selectSymbol(profile: any, bidStats: any[], oracleScores: any[], candidates?: string[]): string {
  let availableSymbols = candidates || oracleScores.map((s) => s.symbol);
  const userBestSymbols = bidStats
    .filter((s) => s.trades >= 3 && s.win_rate >= 0.5)
    .sort((a, b) => b.win_rate * b.avg_rr - a.win_rate * a.avg_rr)
    .map((s) => s.symbol);

  const intersection = availableSymbols.filter(
    (sym) => userBestSymbols.includes(sym) || oracleScores.find((o) => o.symbol === sym)
  );

  if (intersection.length > 0) {
    const scored = intersection.map((sym) => {
      const userStats = bidStats.find((s) => s.symbol === sym);
      const oracleScore = oracleScores.find((o) => o.symbol === sym);
      const userScore = userStats ? userStats.win_rate * userStats.avg_rr * 100 : 0;
      const oScore = oracleScore ? oracleScore.hit_rate * oracleScore.avg_edge_bp : 0;
      return { symbol: sym, score: userScore + oScore };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].symbol;
  }

  if (oracleScores.length > 0) {
    const topOracle = [...oracleScores].sort(
      (a, b) => b.hit_rate * b.avg_edge_bp - a.hit_rate * a.avg_edge_bp
    );
    return topOracle[0].symbol;
  }

  return availableSymbols[0] || "SPY";
}

function computeRisk(profile: any, bidStats?: any): { risk_pct: number; qty_estimate: number } {
  let baseRisk = profile.max_position_risk_pct;
  if (profile.risk_level === "conservative") baseRisk *= 0.5;
  else if (profile.risk_level === "aggressive") baseRisk *= 1.5;

  if (bidStats && bidStats.trades >= 5) {
    if (bidStats.win_rate >= 0.6 && bidStats.avg_rr >= 2.0) baseRisk *= 1.2;
    else if (bidStats.win_rate < 0.4) baseRisk *= 0.5;
  }

  const risk_pct = Math.min(baseRisk, profile.max_position_risk_pct);
  const qty_estimate = Math.floor((10000 * risk_pct) / 100);
  return { risk_pct, qty_estimate };
}

function proposeStops(symbol: string, tf: string, profile: any): any {
  let stopPct = 0.014;
  let tpMultiple = 2.0;

  if (profile.style === "trend") {
    stopPct = 0.02;
    tpMultiple = 3.0;
  } else if (profile.style === "mean_reversion") {
    stopPct = 0.01;
    tpMultiple = 1.5;
  } else if (profile.style === "breakout") {
    stopPct = 0.012;
    tpMultiple = 2.5;
  }

  if (tf === "1m" || tf === "5m") {
    stopPct *= 0.6;
    tpMultiple = 1.5;
  } else if (tf === "1D" || tf === "1W") {
    stopPct *= 1.5;
  }

  return { type: "percent", stop_loss: stopPct, take_profit: stopPct * tpMultiple };
}

function preValidate(plan: any, flags: any, currentPositionsCount: number, todayTradesCount: number): any {
  const reasons: string[] = [];

  if (flags.paper_only === true && plan.mode === "live") {
    reasons.push("Live trading disabled - paper_only flag is set");
  }

  if (plan.constraints && todayTradesCount >= plan.constraints.max_daily_trades) {
    reasons.push(`Daily trade limit reached: ${todayTradesCount}/${plan.constraints.max_daily_trades}`);
  }

  if (plan.constraints && currentPositionsCount >= plan.constraints.max_open_positions) {
    reasons.push(`Max open positions reached: ${currentPositionsCount}/${plan.constraints.max_open_positions}`);
  }

  if (!plan.symbol || plan.symbol.length < 1 || plan.symbol.length > 5) {
    reasons.push("Invalid symbol");
  }

  return { ok: reasons.length === 0, reasons };
}

function calculateConfidence(bidStats: any, oracleScore: any, profile: any): number {
  let confidence = 0.5;

  if (bidStats && bidStats.trades >= 5) {
    const perfScore = (bidStats.win_rate * bidStats.avg_rr) / 2;
    confidence += perfScore * 0.3;
  }

  if (oracleScore && oracleScore.n >= 10) {
    const oScore = (oracleScore.hit_rate * oracleScore.avg_edge_bp) / 100;
    confidence += oScore * 0.3;
  }

  return Math.max(0, Math.min(1, confidence));
}
