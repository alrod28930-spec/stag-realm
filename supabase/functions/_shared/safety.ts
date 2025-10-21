/**
 * Safety utilities for Phase III
 * Idempotency, validation, and risk clamping
 */

export function idempotencyKey(parts: (string|number)[]): string {
  const base = parts.join("|");
  // Simple hash for idempotency key generation
  let h = 0; 
  for (let i = 0; i < base.length; i++) {
    h = ((h << 5) - h) + base.charCodeAt(i) | 0;
  }
  return "idem:" + h.toString(16);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function validator(plan: any, flags: any): { ok: boolean; errs: string[]; mode: string } {
  const errs: string[] = [];
  const mode = flags?.paper_only ? "paper" : plan?.mode ?? "paper";
  const rpct = plan?.size_logic?.risk_pct ?? 0.01;
  
  if (!flags?.paper_only && flags?.max_live_risk_pct && mode === "live" && rpct > flags.max_live_risk_pct) {
    errs.push(`risk_pct ${rpct} exceeds max_live_risk_pct ${flags.max_live_risk_pct}`);
  }
  
  if (!plan?.symbol) errs.push("missing symbol");
  if (!plan?.stops?.stop_loss || !plan?.stops?.take_profit) errs.push("missing stops");
  
  return { ok: errs.length === 0, errs, mode };
}
