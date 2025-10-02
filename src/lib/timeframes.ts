/**
 * Timeframe normalization
 * Maps common timeframe formats to standard format
 */
export function normalizeTf(tf: string): string {
  const mapping: Record<string, string> = {
    'D': '1D',
    '1d': '1D',
    'day': '1D',
    'daily': '1D',
    '60': '1h',
    '1H': '1h',
    'hour': '1h',
    'hourly': '1h',
    '15': '15m',
    'fifteen': '15m',
    '5': '5m',
    'five': '5m',
    '1': '1m',
    'minute': '1m',
  };

  return mapping[tf] || tf;
}
