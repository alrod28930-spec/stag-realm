// Breakout Scout Strategy - Range breakout with volume confirmation
import { Strategy, MarketCtx, BotConfig, BotDecision } from '../types/strategy';

export class BreakoutScout implements Strategy {
  describe(): BotConfig {
    return {
      name: 'Breakout Scout',
      kind: 'breakout',
      params: {
        lookback: 20,
        vol_mult: 1.3,
      },
      risk: {
        stop_loss_pct: 0.025,
        take_profit_pct: 0.05,
        max_notional: 1000,
      },
    };
  }

  async indicators(ctx: MarketCtx): Promise<void> {
    const lookback = 20;
    const recentCandles = ctx.candles.slice(-lookback);
    
    const highs = recentCandles.map(c => c.h);
    const lows = recentCandles.map(c => c.l);
    const volumes = recentCandles.map(c => c.v || 0);
    
    const rangeHigh = Math.max(...highs);
    const rangeLow = Math.min(...lows);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    ctx.indicators = {
      range_high: rangeHigh,
      range_low: rangeLow,
      avg_volume: avgVolume,
    };
  }

  async decide(ctx: MarketCtx, cfg: BotConfig): Promise<BotDecision> {
    if (!ctx.indicators) {
      return { action: 'none', reason: 'indicators not computed' };
    }

    const current = ctx.candles[ctx.candles.length - 1];
    const rangeHigh = ctx.indicators.range_high as number;
    const rangeLow = ctx.indicators.range_low as number;
    const avgVolume = ctx.indicators.avg_volume as number;
    const volMult = (cfg.params.vol_mult as number) || 1.3;
    const currentVol = current.v || 0;

    // Upside breakout with volume
    if (current.c > rangeHigh && currentVol > avgVolume * volMult) {
      return {
        action: 'enter',
        side: 'buy',
        qty: 1,
        reason: `Upside breakout: ${current.c.toFixed(2)} > ${rangeHigh.toFixed(2)}, vol ${(currentVol / avgVolume).toFixed(2)}x`,
      };
    }

    // Downside breakout with volume
    if (current.c < rangeLow && currentVol > avgVolume * volMult) {
      return {
        action: 'enter',
        side: 'sell',
        qty: 1,
        reason: `Downside breakout: ${current.c.toFixed(2)} < ${rangeLow.toFixed(2)}, vol ${(currentVol / avgVolume).toFixed(2)}x`,
      };
    }

    // Exit if back inside range
    if (current.c < rangeHigh && current.c > rangeLow) {
      return {
        action: 'exit',
        side: 'sell',
        qty: 1,
        reason: `Back inside range: ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}`,
      };
    }

    return { action: 'none', reason: 'no breakout' };
  }
}
