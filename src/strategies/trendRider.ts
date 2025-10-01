// Trend Rider Strategy - Momentum based on EMA crossover
import { Strategy, MarketCtx, BotConfig, BotDecision, calculateEMA } from '../types/strategy';

export class TrendRider implements Strategy {
  describe(): BotConfig {
    return {
      name: 'Trend Rider',
      kind: 'momentum',
      params: {
        ema_fast: 9,
        ema_slow: 21,
        trailing_stop_pct: 0.03,
        tp_pct: 0.06,
      },
      risk: {
        stop_loss_pct: 0.03,
        take_profit_pct: 0.06,
        max_notional: 1000,
      },
    };
  }

  async indicators(ctx: MarketCtx): Promise<void> {
    const closes = ctx.candles.map(c => c.c);
    const emaFast = calculateEMA(closes, 9);
    const emaSlow = calculateEMA(closes, 21);
    
    ctx.indicators = {
      ema_fast: emaFast,
      ema_slow: emaSlow,
      current_ema_fast: emaFast[emaFast.length - 1],
      current_ema_slow: emaSlow[emaSlow.length - 1],
    };
  }

  async decide(ctx: MarketCtx, cfg: BotConfig): Promise<BotDecision> {
    if (!ctx.indicators) {
      return { action: 'none', reason: 'indicators not computed' };
    }

    const close = ctx.candles[ctx.candles.length - 1].c;
    const emaFast = ctx.indicators.current_ema_fast as number;
    const emaSlow = ctx.indicators.current_ema_slow as number;
    const prevEmaFast = (ctx.indicators.ema_fast as number[])[ctx.candles.length - 2];
    const prevEmaSlow = (ctx.indicators.ema_slow as number[])[ctx.candles.length - 2];

    // Entry: EMA fast crosses above slow and price above fast EMA
    if (emaFast > emaSlow && prevEmaFast <= prevEmaSlow && close > emaFast) {
      return {
        action: 'enter',
        side: 'buy',
        qty: 1, // Will be sized by risk function
        reason: `EMA crossover: fast=${emaFast.toFixed(2)} > slow=${emaSlow.toFixed(2)}`,
      };
    }

    // Exit: EMA fast crosses below slow (bearish)
    if (emaFast < emaSlow && prevEmaFast >= prevEmaSlow) {
      return {
        action: 'exit',
        side: 'sell',
        qty: 1,
        reason: `EMA bearish cross: fast=${emaFast.toFixed(2)} < slow=${emaSlow.toFixed(2)}`,
      };
    }

    return { action: 'none', reason: 'no signal' };
  }
}
