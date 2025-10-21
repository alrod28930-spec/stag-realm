/**
 * Predictive utilities for Phase VI
 * Normalization, EWMA, Z-score calculations
 */

export function norm01(n: number, lo: number, hi: number): number {
  const x = (n - lo) / Math.max(1e-9, (hi - lo));
  return Math.max(0, Math.min(1, x));
}

export function ewma(prev: number, next: number, alpha = 0.2): number {
  return prev === undefined ? next : (alpha * next + (1 - alpha) * prev);
}

export function zscore(value: number, mean: number, std: number): number {
  return std > 1e-9 ? (value - mean) / std : 0;
}
