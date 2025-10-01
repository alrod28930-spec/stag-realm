// Mean Reverter Strategy - RSI based mean reversion
import { Strategy, MarketCtx, BotConfig, BotDecision, calculateRSI } from '../types/strategy';

export class MeanReverter implements Strategy {
  describe(): BotConfig {
    return {
      name: 'Mean Reverter',
      kind: 'mean_reversion',
      params: {
        rsi_period: 14,
        oversold: 30,
        overbought: 70,
        exit_neutral: 50,
      },
      risk: {
        stop_loss_pct: 0.02,
        take_profit_pct: 0.03,
        max_notional: 1000,
      },
    };
  }

  async indicators(ctx: MarketCtx): Promise<void> {
    const closes = ctx.candles.map(c => c.c);
    const rsi = calculateRSI(closes, 14);
    
    ctx.indicators = {
      rsi: rsi,
      current_rsi: rsi[rsi.length - 1] || 50,
    };
  }

  async decide(ctx: MarketCtx, cfg: BotConfig): Promise<BotDecision> {
    if (!ctx.indicators) {
      return { action: 'none', reason: 'indicators not computed' };
    }

    const rsi = ctx.indicators.current_rsi as number;
    const oversold = (cfg.params.oversold as number) || 30;
    const overbought = (cfg.params.overbought as number) || 70;
    const exitNeutral = (cfg.params.exit_neutral as number) || 50;

    // Entry: RSI oversold - buy
    if (rsi < oversold) {
      return {
        action: 'enter',
        side: 'buy',
        qty: 1,
        reason: `RSI oversold: ${rsi.toFixed(2)} < ${oversold}`,
      };
    }

    // Entry: RSI overbought - sell
    if (rsi > overbought) {
      return {
        action: 'enter',
        side: 'sell',
        qty: 1,
        reason: `RSI overbought: ${rsi.toFixed(2)} > ${overbought}`,
      };
    }

    // Exit long: RSI back to neutral
    if (rsi > exitNeutral && rsi < overbought) {
      return {
        action: 'exit',
        side: 'sell',
        qty: 1,
        reason: `RSI back to neutral: ${rsi.toFixed(2)}`,
      };
    }

    // Exit short: RSI back to neutral
    if (rsi < exitNeutral && rsi > oversold) {
      return {
        action: 'exit',
        side: 'buy',
        qty: 1,
        reason: `RSI back to neutral: ${rsi.toFixed(2)}`,
      };
    }

    return { action: 'none', reason: `RSI neutral: ${rsi.toFixed(2)}` };
  }
}
