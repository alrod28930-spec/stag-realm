// Strategy module interface for trading bots
export type MarketCtx = {
  wsId: string;
  symbol: string;
  tf: '1m' | '5m' | '15m' | '1h' | '1D';
  candles: Array<{ ts: string; o: number; h: number; l: number; c: number; v?: number }>;
  indicators?: Record<string, number | number[]>;
};

export type BotConfig = {
  name: string;
  kind: 'momentum' | 'mean_reversion' | 'breakout' | 'risk_arbitrage' | 'custom';
  params: Record<string, number | string | boolean>;
  risk: { 
    stop_loss_pct: number; 
    take_profit_pct?: number; 
    max_notional?: number 
  };
};

export type BotDecision =
  | { action: 'none'; reason?: string }
  | { action: 'enter'; side: 'buy' | 'sell'; qty: number; reason: string }
  | { action: 'exit'; side: 'buy' | 'sell'; qty: number; reason: string };

export interface Strategy {
  describe(): BotConfig;
  indicators?(ctx: MarketCtx): Promise<void>;
  decide(ctx: MarketCtx, cfg: BotConfig): Promise<BotDecision>;
}

// Helper: Calculate EMA
export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// Helper: Calculate RSI
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
    } else {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 1);
      rsi.push(100 - 100 / (1 + rs));

      const newChange = prices[i] - prices[i - 1];
      gains = (avgGain * (period - 1) + (newChange > 0 ? newChange : 0)) / period;
      losses = (avgLoss * (period - 1) + (newChange < 0 ? -newChange : 0)) / period;
    }
  }
  return rsi;
}

// Helper: Position sizing by risk
export function sizeByRisk(equity: number, maxNotional: number, price: number): number {
  const notional = Math.min(maxNotional, equity * 0.02); // cap at 2% equity or policy
  return Math.max(1, Math.floor(notional / price));
}
