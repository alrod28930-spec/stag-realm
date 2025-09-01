// Mathematical Formulas for Core Scaffold

import { 
  RelevanceComponents, 
  RiskStateComponents, 
  ConfidenceComponents,
  SignalStrength,
  RelevanceScore,
  RiskState,
  BotConfidence,
  FreshnessLevel
} from '@/types/core';
import { FORMULA_WEIGHTS, FRESHNESS_THRESHOLDS } from './constants';

// Relevance Formula
// relevance = 0.45*signal_strength + 0.25*portfolio_overlap + 0.20*recency_weight + 0.10*volatility_fit
export function calculateRelevance(components: RelevanceComponents): RelevanceScore {
  const weights = FORMULA_WEIGHTS.RELEVANCE;
  
  const relevance = 
    weights.SIGNAL_STRENGTH * components.signal_strength +
    weights.PORTFOLIO_OVERLAP * components.portfolio_overlap +
    weights.RECENCY_WEIGHT * components.recency_weight +
    weights.VOLATILITY_FIT * components.volatility_fit;

  // Ensure bounds [0, 1]
  return Math.max(0, Math.min(1, relevance));
}

// Risk State Formula  
// risk_state = 0.35*drawdown_norm + 0.25*exposure_norm + 0.20*vol_spike_norm + 0.10*liquidity_norm + 0.10*concentration_norm
export function calculateRiskState(components: RiskStateComponents): RiskState {
  const weights = FORMULA_WEIGHTS.RISK_STATE;
  
  const riskState = 
    weights.DRAWDOWN_NORM * components.drawdown_norm +
    weights.EXPOSURE_NORM * components.exposure_norm +
    weights.VOL_SPIKE_NORM * components.vol_spike_norm +
    weights.LIQUIDITY_NORM * components.liquidity_norm +
    weights.CONCENTRATION_NORM * components.concentration_norm;

  // Ensure bounds [0, 100]
  return Math.max(0, Math.min(100, riskState * 100));
}

// Confidence Formula
// confidence = 0.40*signal_strength + 0.25*bot_accuracy + 0.20*trend_confirmation + 0.15*volatility_regime_fit
export function calculateConfidence(components: ConfidenceComponents): BotConfidence {
  const weights = FORMULA_WEIGHTS.CONFIDENCE;
  
  const confidence = 
    weights.SIGNAL_STRENGTH * components.signal_strength +
    weights.BOT_ACCURACY * components.bot_accuracy +
    weights.TREND_CONFIRMATION * components.trend_confirmation +
    weights.VOLATILITY_REGIME_FIT * components.volatility_regime_fit;

  // Ensure bounds [0, 100]
  return Math.max(0, Math.min(100, confidence * 100));
}

// Helper Functions

// Calculate recency weight based on timestamp
export function calculateRecencyWeight(timestamp: Date): number {
  const ageSeconds = (Date.now() - timestamp.getTime()) / 1000;
  
  if (ageSeconds <= FRESHNESS_THRESHOLDS.live.max) {
    return 1.0; // Live data gets full weight
  } else if (ageSeconds <= FRESHNESS_THRESHOLDS.warm.max) {
    // Linear decay from 1.0 to 0.3 over warm period
    const warmRange = FRESHNESS_THRESHOLDS.warm.max - FRESHNESS_THRESHOLDS.warm.min;
    const warmAge = ageSeconds - FRESHNESS_THRESHOLDS.warm.min;
    return 1.0 - (0.7 * (warmAge / warmRange));
  } else {
    // Stale data gets minimal weight with exponential decay
    const staleAge = ageSeconds - FRESHNESS_THRESHOLDS.warm.max;
    return 0.3 * Math.exp(-staleAge / 600); // Decay over 10 minutes
  }
}

// Calculate portfolio overlap (0-1)
export function calculatePortfolioOverlap(symbol: string, portfolioSymbols: string[]): number {
  if (portfolioSymbols.includes(symbol)) {
    return 1.0; // Direct match
  }
  
  // Could implement sector/correlation-based overlap here
  // For now, simple binary check
  return 0.0;
}

// Calculate volatility fit (0-1)
export function calculateVolatilityFit(currentVol: number, preferredVolRange: [number, number]): number {
  const [minVol, maxVol] = preferredVolRange;
  
  if (currentVol >= minVol && currentVol <= maxVol) {
    return 1.0; // Perfect fit
  } else if (currentVol < minVol) {
    // Too low volatility
    return Math.max(0, currentVol / minVol);
  } else {
    // Too high volatility  
    return Math.max(0, maxVol / currentVol);
  }
}

// Normalize value to 0-1 range
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Calculate drawdown normalized (0-1)
export function calculateDrawdownNorm(currentDrawdown: number, maxAllowedDrawdown: number): number {
  return normalize(Math.abs(currentDrawdown), 0, maxAllowedDrawdown);
}

// Calculate exposure normalized (0-1)
export function calculateExposureNorm(currentExposure: number, maxAllowedExposure: number): number {
  return normalize(currentExposure, 0, maxAllowedExposure);
}

// Calculate volatility spike normalized (0-1)
export function calculateVolSpikeNorm(currentVol: number, baselineVol: number): number {
  const spikeRatio = currentVol / (baselineVol || 1);
  return normalize(spikeRatio, 1, 3); // 3x spike is maximum
}

// Calculate liquidity normalized (0-1)
export function calculateLiquidityNorm(currentVolume: number, averageVolume: number): number {
  const liquidityRatio = currentVolume / (averageVolume || 1);
  // Lower volume = higher risk, so invert
  return 1 - normalize(liquidityRatio, 0.1, 1.0);
}

// Calculate concentration normalized (0-1)  
export function calculateConcentrationNorm(largestPositionPercent: number): number {
  return normalize(largestPositionPercent, 0, 50); // 50% is max concentration
}

// Get freshness level from age
export function getFreshnessLevel(ageSeconds: number): FreshnessLevel {
  if (ageSeconds <= FRESHNESS_THRESHOLDS.live.max) {
    return 'live';
  } else if (ageSeconds <= FRESHNESS_THRESHOLDS.warm.max) {
    return 'warm';
  } else {
    return 'stale';
  }
}

// Calculate trend confirmation (0-1)
export function calculateTrendConfirmation(
  shortMA: number, 
  longMA: number, 
  volume: number, 
  avgVolume: number
): number {
  // Trend strength based on MA separation
  const trendStrength = Math.abs(shortMA - longMA) / longMA;
  const normalizedTrend = normalize(trendStrength, 0, 0.1); // 10% separation is strong
  
  // Volume confirmation
  const volumeConfirmation = normalize(volume / avgVolume, 0.5, 2.0);
  
  // Combine trend and volume
  return (normalizedTrend * 0.7) + (volumeConfirmation * 0.3);
}

// Calculate volatility regime fit (0-1)
export function calculateVolatilityRegimeFit(
  currentVol: number,
  recentVolHistory: number[],
  strategy: string
): number {
  if (recentVolHistory.length === 0) return 0.5;
  
  const avgHistoricalVol = recentVolHistory.reduce((a, b) => a + b, 0) / recentVolHistory.length;
  const volRatio = currentVol / avgHistoricalVol;
  
  // Different strategies prefer different volatility regimes
  switch (strategy) {
    case 'momentum':
      // Momentum strategies prefer higher volatility
      return normalize(volRatio, 0.8, 2.0);
    case 'mean_reversion':
      // Mean reversion prefers stable volatility  
      return 1 - Math.abs(volRatio - 1);
    case 'breakout':
      // Breakout strategies prefer volatility expansion
      return normalize(volRatio, 1.2, 3.0);
    default:
      // Default: moderate volatility preference
      return 1 - Math.abs(volRatio - 1);
  }
}