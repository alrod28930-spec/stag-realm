/**
 * Execution safety utilities for Phase IV
 * Circuit breakers and position limit checks
 */

export async function circuitBreaker(
  supabase: any, 
  workspace_id: string, 
  pnl24h: number, 
  equity: number
): Promise<void> {
  const drawdown = pnl24h < 0 ? Math.abs(pnl24h) / equity : 0;
  const maxDrawdown = parseFloat(Deno.env.get("MAX_LIVE_DRAWDOWN_PCT") || "0.05");
  
  if (drawdown > maxDrawdown) {
    await supabase.from("repository_events").insert({
      workspace_id, 
      source: "risk_guard",
      payload: { 
        event: "circuit_breaker_triggered", 
        drawdown,
        pnl24h,
        equity 
      }
    });
    
    await supabase.from("execution_audit").insert({
      workspace_id,
      event: "circuit_breaker",
      payload: { drawdown, maxDrawdown, pnl24h, equity }
    });
    
    throw new Error(`Circuit breaker: drawdown ${(drawdown * 100).toFixed(2)}% exceeds ${(maxDrawdown * 100).toFixed(2)}%`);
  }
}

export async function positionLimitCheck(
  supabase: any, 
  workspace_id: string, 
  openRiskPct: number
): Promise<void> {
  const maxPortfolioRisk = parseFloat(Deno.env.get("MAX_PORTFOLIO_RISK_PCT") || "0.10");
  
  if (openRiskPct > maxPortfolioRisk) {
    await supabase.from("repository_events").insert({
      workspace_id,
      source: "risk_guard",
      payload: { 
        event: "portfolio_risk_exceeded", 
        openRiskPct 
      }
    });
    
    await supabase.from("execution_audit").insert({
      workspace_id,
      event: "position_limit_exceeded",
      payload: { openRiskPct, maxPortfolioRisk }
    });
    
    throw new Error(`Portfolio risk ${(openRiskPct * 100).toFixed(2)}% exceeds cap ${(maxPortfolioRisk * 100).toFixed(2)}%`);
  }
}

export function isLiveExecutionEnabled(): boolean {
  return Deno.env.get("LIVE_EXECUTION_ENABLED") === "true";
}
