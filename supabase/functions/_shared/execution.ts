/**
 * Execution risk guards with RLS-safe operations and math edge case handling
 */

async function loadRiskCaps(
  supabase: any,
  workspace_id: string
): Promise<{ maxDrawdown: number; maxPortfolioRisk: number }> {
  // Try DB first
  const { data } = await supabase
    .from("risk_settings")
    .select("daily_drawdown_halt_pct, per_trade_risk_pct")
    .eq("workspace_id", workspace_id)
    .limit(1)
    .maybeSingle();

  const dd = data?.daily_drawdown_halt_pct;
  const pr = data?.per_trade_risk_pct;

  // Fallback to env
  const envDD = parseFloat(Deno.env.get("MAX_LIVE_DRAWDOWN_PCT") || "0.05");
  const envPR = parseFloat(Deno.env.get("MAX_PORTFOLIO_RISK_PCT") || "0.10");
  
  return {
    maxDrawdown: Number.isFinite(dd) ? Number(dd) : envDD,
    maxPortfolioRisk: Number.isFinite(pr) ? Number(pr) : envPR,
  };
}

async function logEvent(
  supabase: any,
  workspace_id: string,
  event_type: string,
  payload: unknown
) {
  // Prefer hardened RPC if you've applied the membership check
  const { error } = await supabase.rpc("recorder_log", {
    p_workspace: workspace_id,
    p_event_type: event_type,
    p_severity: 2,
    p_entity_type: "risk_guard",
    p_entity_id: null,
    p_summary: event_type,
    p_payload: payload as any,
  });
  
  if (error) {
    // fallback (only if repository_events exists and has safe RLS)
    await supabase.from("repository_events").insert({
      workspace_id,
      source: "risk_guard",
      payload,
    });
  }
}

export async function circuitBreaker(
  supabase: any,
  workspace_id: string,
  pnl24h: number,
  equity: number
): Promise<void> {
  if (!Number.isFinite(pnl24h) || !Number.isFinite(equity)) {
    throw new Error("Circuit breaker: invalid inputs");
  }
  if (equity <= 0) {
    throw new Error("Circuit breaker: equity must be > 0");
  }

  const { maxDrawdown } = await loadRiskCaps(supabase, workspace_id);
  const drawdown = pnl24h < 0 ? Math.abs(pnl24h) / equity : 0;

  if (drawdown > maxDrawdown) {
    await logEvent(supabase, workspace_id, "circuit_breaker_triggered", {
      drawdown,
      pnl24h,
      equity,
      maxDrawdown,
    });
    throw new Error(
      `Circuit breaker: drawdown ${(drawdown * 100).toFixed(2)}% exceeds ${(maxDrawdown * 100).toFixed(2)}%`
    );
  }
}

export async function positionLimitCheck(
  supabase: any,
  workspace_id: string,
  openRiskPct: number
): Promise<void> {
  if (!Number.isFinite(openRiskPct) || openRiskPct < 0) {
    throw new Error("Position limit: invalid openRiskPct");
  }
  
  const { maxPortfolioRisk } = await loadRiskCaps(supabase, workspace_id);

  if (openRiskPct > maxPortfolioRisk) {
    await logEvent(supabase, workspace_id, "portfolio_risk_exceeded", {
      openRiskPct,
      maxPortfolioRisk,
    });
    throw new Error(
      `Portfolio risk ${(openRiskPct * 100).toFixed(2)}% exceeds cap ${(maxPortfolioRisk * 100).toFixed(2)}%`
    );
  }
}

export function isLiveExecutionEnabled(): boolean {
  return (Deno.env.get("LIVE_EXECUTION_ENABLED") || "").toLowerCase() === "true";
}
