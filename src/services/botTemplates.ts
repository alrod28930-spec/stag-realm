import { eventBus } from './eventBus';
import { tradeBotSystem } from './tradeBots';
import type { BotStrategy, TradeBot } from '@/types/tradeBots';

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  strategy_type: BotStrategy;
  tier_requirement: 'pro' | 'elite';
  category: 'momentum' | 'mean_reversion' | 'breakout' | 'risk_management' | 'scalping';
  entry_rules: string[];
  exit_rules: string[];
  trade_limits: {
    max_trades_per_day: number;
    max_capital_per_trade: string;
    risk_per_trade_pct?: number;
    stop_loss_pct?: number;
    take_profit_pct?: number;
  };
  default_config: {
    allocation: number;
    riskTolerance: number;
    maxPositionSize: number;
    maxDailyTrades: number;
    minConfidenceThreshold: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDrawdownPercent: number;
    minStockPrice: number;
    strategyParams: Record<string, any>;
  };
  educational_notes: string[];
  risk_level: 'low' | 'medium' | 'high';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export const DEFAULT_BOT_TEMPLATES: BotTemplate[] = [
  {
    id: 'trend_rider',
    name: 'Trend Rider',
    description: 'Momentum-based bot that buys strong uptrends and exits on weakness. Perfect for riding market momentum.',
    strategy_type: 'momentum',
    tier_requirement: 'pro',
    category: 'momentum',
    entry_rules: [
      'Price closes above 50-day moving average',
      'Volume above 150% of daily average',
      'RSI between 40-80 (not overbought)',
      'Positive price momentum over 5 days'
    ],
    exit_rules: [
      'Price closes below 50-day moving average',
      'Stop loss triggered at -5%',
      'RSI drops below 30',
      'Volume falls below average for 2+ days'
    ],
    trade_limits: {
      max_trades_per_day: 5,
      max_capital_per_trade: '20% of allocation',
      risk_per_trade_pct: 2,
      stop_loss_pct: 5,
      take_profit_pct: 15
    },
    default_config: {
      allocation: 5000,
      riskTolerance: 0.6,
      maxPositionSize: 1000,
      maxDailyTrades: 5,
      minConfidenceThreshold: 0.7,
      stopLossPercent: 5,
      takeProfitPercent: 15,
      maxDrawdownPercent: 10,
      minStockPrice: 5,
      strategyParams: {
        ma_period: 50,
        volume_threshold: 1.5,
        rsi_upper: 80,
        rsi_lower: 40,
        momentum_days: 5
      }
    },
    educational_notes: [
      'Works best in trending markets with clear direction',
      'Avoid using during high volatility or choppy markets',
      'Consider market conditions and sector rotation',
      'Monitor volume confirmation for stronger signals'
    ],
    risk_level: 'medium',
    complexity: 'beginner'
  },
  {
    id: 'dip_sniper',
    name: 'Dip Sniper',
    description: 'Mean reversion bot that buys dips in strong uptrends. Targets oversold conditions in quality stocks.',
    strategy_type: 'mean_reversion',
    tier_requirement: 'pro',
    category: 'mean_reversion',
    entry_rules: [
      'Price above 200-day moving average (long-term uptrend)',
      'RSI < 30 (oversold condition)',
      'Price down 3%+ from recent high',
      'Volume above average on the dip'
    ],
    exit_rules: [
      'RSI crosses above 50 (momentum returning)',
      'Take profit at +8%',
      'Stop loss at -6%',
      'Price approaches recent resistance level'
    ],
    trade_limits: {
      max_trades_per_day: 3,
      max_capital_per_trade: '25% of allocation',
      risk_per_trade_pct: 2,
      stop_loss_pct: 6,
      take_profit_pct: 8
    },
    default_config: {
      allocation: 4000,
      riskTolerance: 0.5,
      maxPositionSize: 1000,
      maxDailyTrades: 3,
      minConfidenceThreshold: 0.75,
      stopLossPercent: 6,
      takeProfitPercent: 8,
      maxDrawdownPercent: 12,
      minStockPrice: 10,
      strategyParams: {
        ma_long: 200,
        rsi_threshold: 30,
        dip_percentage: 3,
        rsi_exit: 50,
        volume_confirm: true
      }
    },
    educational_notes: [
      'Best used in bull markets or strong uptrending stocks',
      'Requires patience - may take days to weeks for mean reversion',
      'Watch for fundamental changes that could break the trend',
      'Size positions smaller as this strategy has lower win rate'
    ],
    risk_level: 'medium',
    complexity: 'intermediate'
  },
  {
    id: 'breakout_hunter',
    name: 'Breakout Hunter',
    description: 'Captures explosive moves from consolidation patterns. Targets high-momentum breakouts with volume confirmation.',
    strategy_type: 'breakout',
    tier_requirement: 'pro',
    category: 'breakout',
    entry_rules: [
      'Price consolidating in tight range (< 5% over 10+ days)',
      'Breakout above resistance with 2x average volume',
      'No major resistance overhead',
      'Market environment supportive of breakouts'
    ],
    exit_rules: [
      'Stop loss triggered at -5% from entry',
      'Take profit after +10% gain',
      'Volume fades below average for 2+ days',
      'Price fails to hold above breakout level'
    ],
    trade_limits: {
      max_trades_per_day: 4,
      max_capital_per_trade: '15% of allocation',
      risk_per_trade_pct: 3,
      stop_loss_pct: 5,
      take_profit_pct: 10
    },
    default_config: {
      allocation: 6000,
      riskTolerance: 0.7,
      maxPositionSize: 900,
      maxDailyTrades: 4,
      minConfidenceThreshold: 0.8,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      maxDrawdownPercent: 15,
      minStockPrice: 8,
      strategyParams: {
        consolidation_days: 10,
        consolidation_range: 5,
        volume_multiplier: 2,
        resistance_buffer: 0.02
      }
    },
    educational_notes: [
      'Higher risk/reward strategy - expect more volatility',
      'Works best when broader market is in uptrend',
      'False breakouts are common - stick to stop losses',
      'Volume confirmation is crucial for success'
    ],
    risk_level: 'high',
    complexity: 'intermediate'
  },
  {
    id: 'risk_governor',
    name: 'Risk Governor',
    description: 'Portfolio protection bot that monitors all positions and cuts losses automatically. Acts as a safety net.',
    strategy_type: 'volatility', // Using volatility as closest match
    tier_requirement: 'pro',
    category: 'risk_management',
    entry_rules: [
      'Monitors existing positions continuously',
      'Activates when portfolio drawdown > threshold',
      'Scans for positions exceeding risk limits',
      'Watches for correlation clusters'
    ],
    exit_rules: [
      'Force exit if position loss > 10% (default)',
      'Close correlated positions if sector risk high',
      'Reduce position size if portfolio volatility spikes',
      'Emergency exit all if daily loss > 5%'
    ],
    trade_limits: {
      max_trades_per_day: 50, // High limit for risk management actions
      max_capital_per_trade: '100% override capability',
      risk_per_trade_pct: 0, // Risk management doesn't add risk
      stop_loss_pct: 10,
      take_profit_pct: 0 // Not applicable for risk management
    },
    default_config: {
      allocation: 0, // Doesn't allocate capital, manages existing positions
      riskTolerance: 0.3, // Very conservative
      maxPositionSize: 0,
      maxDailyTrades: 50,
      minConfidenceThreshold: 0.9, // High confidence for risk actions
      stopLossPercent: 10,
      takeProfitPercent: 0,
      maxDrawdownPercent: 5, // Triggers emergency protocols
      minStockPrice: 0,
      strategyParams: {
        portfolio_stop_loss: 10,
        daily_loss_limit: 5,
        correlation_threshold: 0.7,
        volatility_spike_threshold: 2,
        monitoring_interval: 300 // 5 minutes
      }
    },
    educational_notes: [
      'Always runs alongside other bots - never trades independently',
      'Can override user settings in emergency situations',
      'Focuses on capital preservation over profit generation',
      'Should be calibrated to your risk tolerance'
    ],
    risk_level: 'low',
    complexity: 'beginner'
  },
  {
    id: 'scalper',
    name: 'Scalper',
    description: 'High-frequency intraday bot targeting small, quick profits. Requires fast execution and tight risk management.',
    strategy_type: 'scalping',
    tier_requirement: 'elite', // Elite only due to complexity
    category: 'scalping',
    entry_rules: [
      'High volume stock (>$10M daily volume)',
      'Micro-dip within established intraday uptrend',
      'Bid-ask spread < 0.05%',
      'Level 2 book shows support/resistance'
    ],
    exit_rules: [
      'Target +1-2% gain achieved',
      'Trailing stop of 0.5-1%',
      'Time-based exit after 30 minutes',
      'Volume dries up or spread widens'
    ],
    trade_limits: {
      max_trades_per_day: 30,
      max_capital_per_trade: '5% of allocation',
      risk_per_trade_pct: 0.5,
      stop_loss_pct: 1,
      take_profit_pct: 2
    },
    default_config: {
      allocation: 10000, // Needs larger capital for many small trades
      riskTolerance: 0.8, // Aggressive but controlled
      maxPositionSize: 500,
      maxDailyTrades: 30,
      minConfidenceThreshold: 0.85,
      stopLossPercent: 1,
      takeProfitPercent: 2,
      maxDrawdownPercent: 3, // Very tight control
      minStockPrice: 20, // Higher priced stocks for scalping
      strategyParams: {
        min_volume_daily: 10000000,
        max_spread_pct: 0.05,
        time_limit_minutes: 30,
        trail_stop_pct: 0.5,
        intraday_only: true
      }
    },
    educational_notes: [
      'Requires significant experience and fast execution',
      'Works only during market hours with high liquidity',
      'Commission costs can eat into small profits',
      'Not suitable for beginners - practice in simulation first'
    ],
    risk_level: 'high',
    complexity: 'advanced'
  }
];

export class BotTemplateService {
  private templates = new Map<string, BotTemplate>();

  constructor() {
    // Initialize templates
    DEFAULT_BOT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  getTemplates(userTier: 'lite' | 'standard' | 'pro' | 'elite' = 'lite'): BotTemplate[] {
    const availableTemplates: BotTemplate[] = [];
    
    this.templates.forEach(template => {
      // Check tier access
      if (userTier === 'lite' || userTier === 'standard') {
        return; // No access to default bots
      }
      
      if (template.tier_requirement === 'pro' && (userTier === 'pro' || userTier === 'elite')) {
        availableTemplates.push(template);
      } else if (template.tier_requirement === 'elite' && userTier === 'elite') {
        availableTemplates.push(template);
      }
    });

    return availableTemplates.sort((a, b) => {
      // Sort by complexity then risk level
      const complexityOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
      if (complexityOrder[a.complexity] !== complexityOrder[b.complexity]) {
        return complexityOrder[a.complexity] - complexityOrder[b.complexity];
      }
      const riskOrder = { 'low': 1, 'medium': 2, 'high': 3 };
      return riskOrder[a.risk_level] - riskOrder[b.risk_level];
    });
  }

  getTemplate(templateId: string): BotTemplate | undefined {
    return this.templates.get(templateId);
  }

  deployTemplate(templateId: string, customConfig?: Partial<BotTemplate['default_config']>): string | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Merge custom config with defaults
    const config = {
      ...template.default_config,
      ...customConfig
    };

    // Create bot using the existing trade bot system
    const bot = tradeBotSystem.createBot({
      name: template.name,
      strategy: template.strategy_type,
      allocation: config.allocation,
      riskTolerance: config.riskTolerance
    });

    if (bot) {
      // Update bot configuration with template settings
      const success = tradeBotSystem.updateBotConfig(bot.id, {
        maxPositionSize: config.maxPositionSize,
        maxDailyTrades: config.maxDailyTrades,
        minConfidenceThreshold: config.minConfidenceThreshold,
        stopLossPercent: config.stopLossPercent,
        takeProfitPercent: config.takeProfitPercent,
        maxDrawdownPercent: config.maxDrawdownPercent,
        minStockPrice: config.minStockPrice,
        blacklistedSymbols: [],
        strategyParams: config.strategyParams
      });

      if (success) {
        // Log deployment event
        eventBus.emit('bot.template.deployed', {
          templateId,
          botId: bot.id,
          templateName: template.name,
          strategy: template.strategy_type,
          allocation: config.allocation,
          timestamp: new Date()
        });

        return bot.id;
      }
    }

    return null;
  }

  getTemplatesByCategory(category: BotTemplate['category'], userTier: 'lite' | 'standard' | 'pro' | 'elite' = 'lite'): BotTemplate[] {
    return this.getTemplates(userTier).filter(template => template.category === category);
  }

  getTemplatesByRisk(riskLevel: BotTemplate['risk_level'], userTier: 'lite' | 'standard' | 'pro' | 'elite' = 'lite'): BotTemplate[] {
    return this.getTemplates(userTier).filter(template => template.risk_level === riskLevel);
  }

  canAccessTemplate(templateId: string, userTier: 'lite' | 'standard' | 'pro' | 'elite'): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    if (userTier === 'lite' || userTier === 'standard') return false;
    if (template.tier_requirement === 'pro' && (userTier === 'pro' || userTier === 'elite')) return true;
    if (template.tier_requirement === 'elite' && userTier === 'elite') return true;

    return false;
  }
}

export const botTemplateService = new BotTemplateService();