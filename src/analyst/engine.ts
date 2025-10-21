/**
 * Analyst v1 - Deterministic Planning Engine
 * Pure functions for symbol selection, risk calculation, and validation
 * No external API calls - all logic is self-contained
 */

export interface UserProfile {
  risk_level: 'conservative' | 'balanced' | 'aggressive';
  style: 'trend' | 'mean_reversion' | 'breakout' | 'mixed';
  max_daily_trades: number;
  max_position_risk_pct: number;
  objectives: Record<string, any>;
}

export interface BIDStats {
  symbol: string;
  tf: string;
  trades: number;
  win_rate: number;
  avg_rr: number;
  avg_hold_minutes: number;
}

export interface OracleScore {
  symbol: string;
  tf: string;
  regime: string;
  n: number;
  hit_rate: number;
  avg_edge_bp: number;
}

export interface AnalystPlan {
  plan_version: string;
  mode: 'paper' | 'live';
  symbol: string;
  tf: string;
  side: 'buy' | 'sell';
  entry_logic: string;
  size_logic: {
    risk_pct: number;
    qty_estimate: number;
  };
  stops: {
    type: 'percent' | 'atr';
    stop_loss: number;
    take_profit: number;
  };
  constraints: {
    max_daily_trades: number;
    max_open_positions: number;
  };
  confidence: number;
  notes: string;
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

/**
 * Select best symbol based on profile, BID stats, and Oracle scores
 */
export function selectSymbol(
  profile: UserProfile,
  bidStats: BIDStats[],
  oracleScores: OracleScore[],
  candidates?: string[]
): string {
  // Filter candidates if provided
  let availableSymbols = candidates || oracleScores.map(s => s.symbol);
  
  // Filter by user's best performing symbols from BID stats
  const userBestSymbols = bidStats
    .filter(s => s.trades >= 3 && s.win_rate >= 0.5)
    .sort((a, b) => (b.win_rate * b.avg_rr) - (a.win_rate * a.avg_rr))
    .map(s => s.symbol);

  // Find intersection of candidates, user best, and oracle top
  const intersection = availableSymbols.filter(sym => 
    userBestSymbols.includes(sym) || oracleScores.find(o => o.symbol === sym)
  );

  if (intersection.length > 0) {
    // Prefer symbols with both good user stats and oracle scores
    const scored = intersection.map(sym => {
      const userStats = bidStats.find(s => s.symbol === sym);
      const oracleScore = oracleScores.find(o => o.symbol === sym);
      
      const userScore = userStats 
        ? (userStats.win_rate * userStats.avg_rr * 100)
        : 0;
      
      const oScore = oracleScore 
        ? (oracleScore.hit_rate * oracleScore.avg_edge_bp)
        : 0;

      return { symbol: sym, score: userScore + oScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].symbol;
  }

  // Fallback: top oracle symbol
  if (oracleScores.length > 0) {
    const topOracle = [...oracleScores]
      .sort((a, b) => (b.hit_rate * b.avg_edge_bp) - (a.hit_rate * a.avg_edge_bp));
    return topOracle[0].symbol;
  }

  // Last resort: first candidate
  return availableSymbols[0] || 'SPY';
}

/**
 * Compute risk sizing based on profile and BID stats
 */
export function computeRisk(
  profile: UserProfile,
  bidStats?: BIDStats
): { risk_pct: number; qty_estimate: number } {
  let baseRisk = profile.max_position_risk_pct;

  // Adjust based on risk level
  if (profile.risk_level === 'conservative') {
    baseRisk *= 0.5;
  } else if (profile.risk_level === 'aggressive') {
    baseRisk *= 1.5;
  }

  // Factor in user's historical performance
  if (bidStats && bidStats.trades >= 5) {
    if (bidStats.win_rate >= 0.6 && bidStats.avg_rr >= 2.0) {
      baseRisk *= 1.2; // Increase risk for proven performers
    } else if (bidStats.win_rate < 0.4) {
      baseRisk *= 0.5; // Reduce risk for struggling traders
    }
  }

  // Cap at profile max
  const risk_pct = Math.min(baseRisk, profile.max_position_risk_pct);

  // Estimate quantity (simplified - actual execution will use real prices)
  const qty_estimate = Math.floor((10000 * risk_pct) / 100); // Assuming $10k account

  return { risk_pct, qty_estimate };
}

/**
 * Propose stop-loss and take-profit levels
 */
export function proposeStops(
  symbol: string,
  tf: string,
  profile: UserProfile
): { type: 'percent'; stop_loss: number; take_profit: number } {
  // Default percentage stops (simplified - can enhance with ATR later)
  let stopPct = 0.014; // 1.4% default stop
  let tpMultiple = 2.0; // 2:1 RR default

  // Adjust based on style
  if (profile.style === 'trend') {
    stopPct = 0.020; // Wider stops for trend following
    tpMultiple = 3.0; // Higher RR targets
  } else if (profile.style === 'mean_reversion') {
    stopPct = 0.010; // Tighter stops for mean reversion
    tpMultiple = 1.5; // Lower RR targets
  } else if (profile.style === 'breakout') {
    stopPct = 0.012;
    tpMultiple = 2.5;
  }

  // Adjust based on timeframe
  if (tf === '1m' || tf === '5m') {
    stopPct *= 0.6; // Tighter for intraday
    tpMultiple = 1.5;
  } else if (tf === '1D' || tf === '1W') {
    stopPct *= 1.5; // Wider for swing/position
  }

  return {
    type: 'percent',
    stop_loss: stopPct,
    take_profit: stopPct * tpMultiple
  };
}

/**
 * Pre-validate plan against constraints
 */
export function preValidate(
  plan: Partial<AnalystPlan>,
  flags: Record<string, any>,
  currentPositionsCount: number,
  todayTradesCount: number
): ValidationResult {
  const reasons: string[] = [];

  // Check paper-only mode
  if (flags.paper_only === true && plan.mode === 'live') {
    reasons.push('Live trading disabled - paper_only flag is set');
  }

  // Check daily trade limit
  if (plan.constraints && todayTradesCount >= plan.constraints.max_daily_trades) {
    reasons.push(`Daily trade limit reached: ${todayTradesCount}/${plan.constraints.max_daily_trades}`);
  }

  // Check max open positions
  if (plan.constraints && currentPositionsCount >= plan.constraints.max_open_positions) {
    reasons.push(`Max open positions reached: ${currentPositionsCount}/${plan.constraints.max_open_positions}`);
  }

  // Check symbol validity (basic)
  if (!plan.symbol || plan.symbol.length < 1 || plan.symbol.length > 5) {
    reasons.push('Invalid symbol');
  }

  return {
    ok: reasons.length === 0,
    reasons
  };
}

/**
 * Calculate overall confidence score
 */
export function calculateConfidence(
  bidStats: BIDStats | undefined,
  oracleScore: OracleScore | undefined,
  profile: UserProfile
): number {
  let confidence = 0.5; // Base confidence

  // Factor in BID stats
  if (bidStats && bidStats.trades >= 5) {
    const perfScore = (bidStats.win_rate * bidStats.avg_rr) / 2;
    confidence += perfScore * 0.3;
  }

  // Factor in Oracle score
  if (oracleScore && oracleScore.n >= 10) {
    const oScore = (oracleScore.hit_rate * oracleScore.avg_edge_bp) / 100;
    confidence += oScore * 0.3;
  }

  // Cap between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}
