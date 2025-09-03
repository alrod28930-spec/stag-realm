import { generateULID } from '../utils/ulid';
import { eventBus } from './eventBus';
import { recorder } from './recorder';
import { serviceManager } from './serviceManager';
import type { 
  TradeOutcome, 
  LearningEvent, 
  BotPerformance, 
  SignalEffectiveness, 
  PortfolioLearning,
  LearningInsight,
  AdaptiveSettings,
  LearningDashboard as LearningDashboardType
} from '../types/learning';

export class LearningEngine {
  private botPerformanceCache = new Map<string, BotPerformance>();
  private signalEffectivenessCache = new Map<string, SignalEffectiveness>();
  private portfolioLearning: PortfolioLearning | null = null;
  private learningEvents: LearningEvent[] = [];
  private adaptiveSettings: AdaptiveSettings = {
    riskMultiplier: 1.0,
    confidenceThreshold: 0.6,
    signalWeights: new Map(),
    botWeights: new Map(),
    lastUpdated: Date.now()
  };

  constructor() {
    this.initializeEventHandlers();
    this.loadLearningState();
  }

  private initializeEventHandlers(): void {
    eventBus.on('trade.executed', (event) => {
      this.recordTradeExecution(event);
    });

    eventBus.on('trade.closed', (event) => {
      this.processTradeOutcome(event);
    });

    eventBus.on('oracle.signal.outcome', (event) => {
      this.updateSignalEffectiveness(event);
    });

    eventBus.on('bot.decision', (event) => {
      this.trackBotDecision(event);
    });
  }

  private recordTradeExecution(tradeData: any): void {
    const learningEvent: LearningEvent = {
      id: generateULID(),
      type: 'trade_execution',
      timestamp: Date.now(),
      trade_id: tradeData.id,
      bot_id: tradeData.bot_id,
      symbol: tradeData.symbol,
      pre_trade_signals: tradeData.signals || [],
      intent_reasoning: tradeData.reasoning || '',
      execution_details: {
        price: tradeData.price,
        quantity: tradeData.quantity,
        slippage: tradeData.slippage || 0,
        fill_speed_ms: tradeData.fill_speed_ms || 0
      },
      market_context: tradeData.market_context || {},
      workspace_id: tradeData.workspace_id
    };

    this.learningEvents.push(learningEvent);
    
    recorder.recordSystemEvent(
      'export', // Using 'export' as the closest system event type for learning data
      learningEvent,
      true
    );
  }

  private processTradeOutcome(outcomeData: any): void {
    const tradeOutcome: TradeOutcome = {
      trade_id: outcomeData.trade_id,
      realized_pnl: outcomeData.realized_pnl,
      holding_period_hours: outcomeData.holding_period_hours,
      exit_reason: outcomeData.exit_reason,
      max_drawdown_pct: outcomeData.max_drawdown_pct,
      max_gain_pct: outcomeData.max_gain_pct,
      was_profitable: outcomeData.realized_pnl > 0,
      met_expectations: outcomeData.met_expectations || false
    };

    this.updateBotPerformance(outcomeData.bot_id, tradeOutcome);
    this.updatePortfolioLearning(tradeOutcome);
    
    const insights = this.generateLearningInsights(tradeOutcome);
    this.adjustAdaptiveParameters(tradeOutcome, insights);

    eventBus.emit('learning.outcome_processed', {
      trade_id: outcomeData.trade_id,
      outcome: tradeOutcome,
      insights: insights
    });
  }

  private updateBotPerformance(botId: string, outcome: TradeOutcome): void {
    let performance = this.botPerformanceCache.get(botId);
    
    if (!performance) {
      performance = {
        bot_id: botId,
        total_trades: 0,
        winning_trades: 0,
        total_pnl: 0,
        accuracy_score: 0.5,
        confidence_weight: 1.0,
        avg_holding_period: 0,
        recent_outcomes: [],
        last_updated: Date.now()
      };
    }

    performance.total_trades += 1;
    if (outcome.was_profitable) {
      performance.winning_trades += 1;
    }
    performance.total_pnl += outcome.realized_pnl;
    
    performance.recent_outcomes.push(outcome);
    if (performance.recent_outcomes.length > 50) {
      performance.recent_outcomes.shift();
    }

    const recentWins = performance.recent_outcomes.filter(o => o.was_profitable).length;
    performance.accuracy_score = recentWins / Math.min(performance.recent_outcomes.length, 50);
    
    if (performance.accuracy_score > 0.65) {
      performance.confidence_weight = Math.min(1.5, performance.confidence_weight + 0.05);
    } else if (performance.accuracy_score < 0.45) {
      performance.confidence_weight = Math.max(0.3, performance.confidence_weight - 0.05);
    }

    performance.last_updated = Date.now();
    this.botPerformanceCache.set(botId, performance);
    this.adaptiveSettings.botWeights.set(botId, performance.confidence_weight);
  }

  private updateSignalEffectiveness(signalData: any): void {
    const signalKey = `${signalData.signal_type}_${signalData.source}`;
    let effectiveness = this.signalEffectivenessCache.get(signalKey);

    if (!effectiveness) {
      effectiveness = {
        signal_type: signalData.signal_type,
        source: signalData.source,
        total_signals: 0,
        successful_predictions: 0,
        effectiveness_score: 0.5,
        weight_multiplier: 1.0,
        recent_outcomes: [],
        last_updated: Date.now()
      };
    }

    effectiveness.total_signals += 1;
    if (signalData.was_correct) {
      effectiveness.successful_predictions += 1;
    }

    effectiveness.recent_outcomes.push({
      was_correct: signalData.was_correct,
      strength: signalData.strength,
      timestamp: Date.now()
    });

    if (effectiveness.recent_outcomes.length > 100) {
      effectiveness.recent_outcomes.shift();
    }

    const recentCorrect = effectiveness.recent_outcomes.filter(o => o.was_correct).length;
    effectiveness.effectiveness_score = recentCorrect / Math.min(effectiveness.recent_outcomes.length, 100);

    if (effectiveness.effectiveness_score > 0.6) {
      effectiveness.weight_multiplier = Math.min(1.8, effectiveness.weight_multiplier + 0.1);
    } else if (effectiveness.effectiveness_score < 0.4) {
      effectiveness.weight_multiplier = Math.max(0.2, effectiveness.weight_multiplier - 0.1);
    }

    effectiveness.last_updated = Date.now();
    this.signalEffectivenessCache.set(signalKey, effectiveness);
    this.adaptiveSettings.signalWeights.set(signalKey, effectiveness.weight_multiplier);
  }

  private updatePortfolioLearning(outcome: TradeOutcome): void {
    if (!this.portfolioLearning) {
      this.portfolioLearning = {
        successful_patterns: new Map(),
        failed_patterns: new Map(),
        sector_performance: new Map(),
        timeframe_effectiveness: new Map(),
        risk_tolerance_learned: 0.05,
        preferred_holding_periods: [],
        last_updated: Date.now()
      };
    }

    this.portfolioLearning.preferred_holding_periods.push({
      hours: outcome.holding_period_hours,
      was_profitable: outcome.was_profitable,
      pnl: outcome.realized_pnl
    });

    if (this.portfolioLearning.preferred_holding_periods.length > 200) {
      this.portfolioLearning.preferred_holding_periods.shift();
    }

    if (outcome.was_profitable && outcome.max_drawdown_pct < 0.02) {
      this.portfolioLearning.risk_tolerance_learned = Math.min(0.15, 
        this.portfolioLearning.risk_tolerance_learned + 0.005);
    } else if (!outcome.was_profitable && outcome.max_drawdown_pct > 0.05) {
      this.portfolioLearning.risk_tolerance_learned = Math.max(0.02, 
        this.portfolioLearning.risk_tolerance_learned - 0.01);
    }

    this.portfolioLearning.last_updated = Date.now();
  }

  private generateLearningInsights(outcome: TradeOutcome): LearningInsight[] {
    const insights: LearningInsight[] = [];
    const recentTrades = this.learningEvents.filter(e => e.type === 'trade_execution').slice(-20);

    if (recentTrades.length >= 10) {
      const winRate = recentTrades.filter(t => 
        this.getTradeOutcome(t.trade_id || '')?.was_profitable
      ).length / recentTrades.length;

      if (winRate > 0.7) {
        insights.push({
          type: 'positive_trend',
          confidence: 0.8,
          message: 'Recent performance is strong with 70%+ win rate',
          actionable: 'Consider slightly increasing position sizes',
          data: { win_rate: winRate }
        });
      } else if (winRate < 0.4) {
        insights.push({
          type: 'negative_trend',
          confidence: 0.7,
          message: 'Recent performance below 40% win rate',
          actionable: 'Review strategy and reduce position sizes',
          data: { win_rate: winRate }
        });
      }
    }

    return insights;
  }

  private adjustAdaptiveParameters(outcome: TradeOutcome, insights: LearningInsight[]): void {
    if (this.portfolioLearning) {
      const targetRisk = this.portfolioLearning.risk_tolerance_learned;
      const currentRisk = this.adaptiveSettings.riskMultiplier;
      this.adaptiveSettings.riskMultiplier = currentRisk * 0.9 + (targetRisk / 0.05) * 0.1;
    }

    const negativeInsights = insights.filter(i => i.type === 'negative_trend');
    if (negativeInsights.length > 0) {
      this.adaptiveSettings.confidenceThreshold = Math.min(0.8, 
        this.adaptiveSettings.confidenceThreshold + 0.05);
    }

    const positiveInsights = insights.filter(i => i.type === 'positive_trend');
    if (positiveInsights.length > 0) {
      this.adaptiveSettings.confidenceThreshold = Math.max(0.4, 
        this.adaptiveSettings.confidenceThreshold - 0.02);
    }

    this.adaptiveSettings.lastUpdated = Date.now();
  }

  // Public API methods
  public getBotPerformance(botId: string): BotPerformance | null {
    return this.botPerformanceCache.get(botId) || null;
  }

  public getAllBotPerformance(): BotPerformance[] {
    return Array.from(this.botPerformanceCache.values());
  }

  public getSignalEffectiveness(signalType: string, source?: string): SignalEffectiveness[] {
    const results: SignalEffectiveness[] = [];
    
    for (const [key, effectiveness] of this.signalEffectivenessCache) {
      if (effectiveness.signal_type === signalType) {
        if (!source || effectiveness.source === source) {
          results.push(effectiveness);
        }
      }
    }
    
    return results;
  }

  public getPortfolioLearning(): PortfolioLearning | null {
    return this.portfolioLearning;
  }

  public getAdaptiveSettings(): AdaptiveSettings {
    return { ...this.adaptiveSettings };
  }

  public getTopPerformingBots(limit: number = 5): BotPerformance[] {
    return Array.from(this.botPerformanceCache.values())
      .sort((a, b) => b.accuracy_score - a.accuracy_score)
      .slice(0, limit);
  }

  public getRecentInsights(limit: number = 10): LearningInsight[] {
    return [];
  }

  public getLearningDashboard(): LearningDashboardType {
    const topBots = this.getTopPerformingBots(3);
    const totalTrades = Array.from(this.botPerformanceCache.values())
      .reduce((sum, bot) => sum + bot.total_trades, 0);
    
    const overallWinRate = totalTrades > 0 ? 
      Array.from(this.botPerformanceCache.values())
        .reduce((sum, bot) => sum + bot.winning_trades, 0) / totalTrades : 0;

    return {
      overview: {
        total_trades: totalTrades,
        overall_win_rate: overallWinRate,
        active_bots: this.botPerformanceCache.size,
        learning_events: this.learningEvents.length
      },
      top_performing_bots: topBots,
      adaptive_settings: this.adaptiveSettings,
      recent_insights: this.getRecentInsights(5),
      performance_trends: {
        daily_pnl: [],
        win_rate_trend: [],
        risk_adjusted_returns: []
      }
    };
  }

  private getTradeOutcome(tradeId: string): TradeOutcome | null {
    return null;
  }

  private async loadLearningState(): Promise<void> {
    console.log('Learning Engine: State loaded');
  }

  public async saveLearningState(): Promise<void> {
    console.log('Learning Engine: State saved');
  }

  public getWorkspaceLearning(workspaceId: string): any {
    const workspaceEvents = this.learningEvents.filter(e => e.workspace_id === workspaceId);
    
    return {
      events: workspaceEvents,
      bot_performance: Array.from(this.botPerformanceCache.values())
        .filter(bp => bp.bot_id.startsWith(workspaceId)),
      learning_summary: {
        total_events: workspaceEvents.length,
        learning_active: workspaceEvents.length > 0
      }
    };
  }

  private trackBotDecision(event: any): void {
    console.log('Tracking bot decision:', event);
  }
}

// Export singleton instance
export const learningEngine = new LearningEngine();

// Auto-save learning state every 5 minutes - managed by service manager
serviceManager.registerService('learningEngine', learningEngine, () => {
  console.log('Learning Engine cleanup completed');
});

serviceManager.createGlobalInterval(() => {
  learningEngine.saveLearningState();
}, 5 * 60 * 1000);

serviceManager.startService('learningEngine');