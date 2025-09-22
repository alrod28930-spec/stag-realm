// Strategy Learning System - Evolves and improves trading strategies based on outcomes

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { StrategyEvolution, MarketRegime } from '@/types/marketIntelligence';

export class StrategyLearningSystem {
  private strategies: Map<string, StrategyEvolution> = new Map();
  private performanceHistory: Map<string, any[]> = new Map(); // strategy -> performance records
  
  // Learning parameters
  private readonly LEARNING_RATE = 0.1;
  private readonly MIN_TRADES_FOR_LEARNING = 10;
  private readonly PERFORMANCE_WINDOW = 50; // Number of recent trades to consider
  
  constructor() {
    this.initializeEventListeners();
    this.initializeBaseStrategies();
  }
  
  private initializeEventListeners(): void {
    // Learn from trade outcomes
    eventBus.on('trade.closed', (outcome) => {
      this.learnFromTradeOutcome(outcome);
    });
    
    // Learn from market regime changes
    eventBus.on('market.regime_changed', (regime) => {
      this.adaptToMarketRegime(regime);
    });
    
    // Learn from strategy comparisons
    eventBus.on('strategy.comparison', (comparison) => {
      this.learnFromComparison(comparison);
    });
    
    // Manual strategy adjustments
    eventBus.on('strategy.manual_adjustment', (adjustment) => {
      this.recordManualAdjustment(adjustment);
    });
  }
  
  private initializeBaseStrategies(): void {
    // Initialize with common trading strategies
    const baseStrategies = [
      {
        id: 'momentum_following',
        name: 'Momentum Following',
        parameters: {
          rsi_threshold: 70,
          volume_multiplier: 1.5,
          breakout_threshold: 0.02,
          stop_loss: 0.05,
          take_profit: 0.10,
          holding_period_max: 24
        }
      },
      {
        id: 'mean_reversion',
        name: 'Mean Reversion',
        parameters: {
          rsi_oversold: 30,
          rsi_overbought: 70,
          bb_position: 0.1, // Position relative to Bollinger Bands
          stop_loss: 0.03,
          take_profit: 0.06,
          holding_period_max: 48
        }
      },
      {
        id: 'trend_following',
        name: 'Trend Following',
        parameters: {
          ma_fast: 20,
          ma_slow: 50,
          ma_trend: 200,
          atr_multiplier: 2.0,
          stop_loss: 0.04,
          take_profit: 0.12,
          holding_period_max: 168 // 7 days
        }
      },
      {
        id: 'breakout_trading',
        name: 'Breakout Trading',
        parameters: {
          volume_threshold: 2.0,
          price_change_threshold: 0.03,
          consolidation_period: 10, // bars
          stop_loss: 0.02,
          take_profit: 0.08,
          holding_period_max: 12
        }
      }
    ];
    
    baseStrategies.forEach(strategy => {
      const evolution: StrategyEvolution = {
        strategyId: strategy.id,
        name: strategy.name,
        originalParameters: { ...strategy.parameters },
        currentParameters: { ...strategy.parameters },
        evolutionHistory: [],
        learningMetrics: {
          adaptationCount: 0,
          improvementRate: 0,
          stabilityScore: 1.0,
          overallPerformance: 0.5
        },
        marketConditionPerformance: {},
        userSpecificLearning: {}
      };
      
      this.strategies.set(strategy.id, evolution);
    });
  }
  
  private learnFromTradeOutcome(outcome: any): void {
    const strategyId = outcome.strategyId || outcome.strategy_id;
    if (!strategyId) return;
    
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;
    
    // Record performance
    let history = this.performanceHistory.get(strategyId) || [];
    history.push({
      timestamp: new Date(),
      pnl: outcome.realized_pnl,
      winRate: outcome.realized_pnl > 0 ? 1 : 0,
      holdingPeriod: outcome.holding_period_hours,
      maxDrawdown: outcome.max_drawdown_pct,
      exitReason: outcome.exit_reason,
      marketCondition: outcome.market_condition,
      parameters: { ...strategy.currentParameters }
    });
    
    // Keep only recent history
    if (history.length > this.PERFORMANCE_WINDOW * 2) {
      history = history.slice(-this.PERFORMANCE_WINDOW);
    }
    this.performanceHistory.set(strategyId, history);
    
    // Learn and adapt if we have enough data
    if (history.length >= this.MIN_TRADES_FOR_LEARNING) {
      this.adaptStrategy(strategy, history);
    }
    
    // Update market condition performance
    this.updateMarketConditionPerformance(strategy, outcome);
  }
  
  private adaptStrategy(strategy: StrategyEvolution, history: any[]): void {
    const recentHistory = history.slice(-this.PERFORMANCE_WINDOW);
    const currentPerformance = this.calculatePerformance(recentHistory);
    
    // Compare with previous performance
    const olderHistory = history.slice(-this.PERFORMANCE_WINDOW * 2, -this.PERFORMANCE_WINDOW);
    const previousPerformance = olderHistory.length > 0 ? this.calculatePerformance(olderHistory) : 0;
    
    // If performance is declining, try to adapt
    if (currentPerformance < previousPerformance || currentPerformance < 0.4) {
      this.optimizeStrategyParameters(strategy, recentHistory);
    }
    
    // Update learning metrics
    strategy.learningMetrics.overallPerformance = currentPerformance;
    if (currentPerformance > previousPerformance) {
      strategy.learningMetrics.improvementRate += 0.1;
    } else {
      strategy.learningMetrics.improvementRate = Math.max(0, strategy.learningMetrics.improvementRate - 0.05);
    }
  }
  
  private optimizeStrategyParameters(strategy: StrategyEvolution, history: any[]): void {
    const adaptations: any[] = [];
    
    // Analyze what parameters might need adjustment
    const avgHoldingPeriod = history.reduce((sum, h) => sum + h.holdingPeriod, 0) / history.length;
    const avgDrawdown = history.reduce((sum, h) => sum + (h.maxDrawdown || 0), 0) / history.length;
    const winRate = history.filter(h => h.pnl > 0).length / history.length;
    
    // Adjust stop loss based on drawdown patterns
    if (avgDrawdown > 0.08 && strategy.currentParameters.stop_loss) {
      const newStopLoss = Math.max(0.02, strategy.currentParameters.stop_loss * 0.8);
      adaptations.push({
        parameter: 'stop_loss',
        oldValue: strategy.currentParameters.stop_loss,
        newValue: newStopLoss,
        reason: 'Reducing stop loss due to high average drawdown'
      });
      strategy.currentParameters.stop_loss = newStopLoss;
    }
    
    // Adjust take profit based on win rate
    if (winRate < 0.4 && strategy.currentParameters.take_profit) {
      const newTakeProfit = strategy.currentParameters.take_profit * 0.8;
      adaptations.push({
        parameter: 'take_profit',
        oldValue: strategy.currentParameters.take_profit,
        newValue: newTakeProfit,
        reason: 'Reducing take profit target due to low win rate'
      });
      strategy.currentParameters.take_profit = newTakeProfit;
    }
    
    // Adjust RSI thresholds for momentum strategies
    if (strategy.strategyId === 'momentum_following' && winRate < 0.5) {
      const newRsiThreshold = Math.min(80, strategy.currentParameters.rsi_threshold + 5);
      adaptations.push({
        parameter: 'rsi_threshold',
        oldValue: strategy.currentParameters.rsi_threshold,
        newValue: newRsiThreshold,
        reason: 'Raising RSI threshold to filter for stronger momentum'
      });
      strategy.currentParameters.rsi_threshold = newRsiThreshold;
    }
    
    // Adjust volume requirements for breakout strategies
    if (strategy.strategyId === 'breakout_trading' && avgDrawdown > 0.06) {
      const newVolumeThreshold = strategy.currentParameters.volume_threshold * 1.2;
      adaptations.push({
        parameter: 'volume_threshold',
        oldValue: strategy.currentParameters.volume_threshold,
        newValue: newVolumeThreshold,
        reason: 'Increasing volume requirement to filter for stronger breakouts'
      });
      strategy.currentParameters.volume_threshold = newVolumeThreshold;
    }
    
    // Record adaptations
    adaptations.forEach(adaptation => {
      strategy.evolutionHistory.push({
        timestamp: new Date(),
        change: `${adaptation.parameter}: ${adaptation.oldValue} → ${adaptation.newValue}`,
        reason: adaptation.reason,
        performance: {
          before: this.calculateRecentPerformance(history.slice(-20)),
          after: 0 // Will be updated as new trades come in
        }
      });
    });
    
    if (adaptations.length > 0) {
      strategy.learningMetrics.adaptationCount += adaptations.length;
      
      // Emit strategy evolution event
      eventBus.emit('strategy.evolved', {
        strategyId: strategy.strategyId,
        adaptations,
        newParameters: strategy.currentParameters
      });
      
      logService.log('info', 'Strategy parameters adapted', {
        strategyId: strategy.strategyId,
        adaptationCount: adaptations.length
      });
    }
  }
  
  private adaptToMarketRegime(regime: MarketRegime): void {
    // Adapt all strategies based on new market regime
    this.strategies.forEach((strategy, strategyId) => {
      const regimePerformance = strategy.marketConditionPerformance[regime.type];
      
      if (regimePerformance && regimePerformance.winRate < 0.4) {
        // This strategy performs poorly in this regime - make it more conservative
        this.makeStrategyConservative(strategy, regime);
      } else if (regimePerformance && regimePerformance.winRate > 0.7) {
        // This strategy performs well in this regime - can be more aggressive
        this.makeStrategyAggressive(strategy, regime);
      }
    });
  }
  
  private makeStrategyConservative(strategy: StrategyEvolution, regime: MarketRegime): void {
    const conservativeAdjustments: any[] = [];
    
    // Tighter stop losses
    if (strategy.currentParameters.stop_loss) {
      const newStopLoss = strategy.currentParameters.stop_loss * 0.8;
      conservativeAdjustments.push({
        parameter: 'stop_loss',
        change: newStopLoss,
        reason: `Conservative adjustment for ${regime.type} market`
      });
      strategy.currentParameters.stop_loss = newStopLoss;
    }
    
    // Higher entry thresholds
    if (strategy.currentParameters.rsi_threshold) {
      const newThreshold = Math.min(85, strategy.currentParameters.rsi_threshold + 5);
      conservativeAdjustments.push({
        parameter: 'rsi_threshold',
        change: newThreshold,
        reason: `Higher threshold for ${regime.type} market selectivity`
      });
      strategy.currentParameters.rsi_threshold = newThreshold;
    }
    
    this.recordRegimeAdjustments(strategy, conservativeAdjustments, regime);
  }
  
  private makeStrategyAggressive(strategy: StrategyEvolution, regime: MarketRegime): void {
    const aggressiveAdjustments: any[] = [];
    
    // Wider stop losses for more room
    if (strategy.currentParameters.stop_loss) {
      const newStopLoss = Math.min(0.10, strategy.currentParameters.stop_loss * 1.2);
      aggressiveAdjustments.push({
        parameter: 'stop_loss',
        change: newStopLoss,
        reason: `More room for ${regime.type} market volatility`
      });
      strategy.currentParameters.stop_loss = newStopLoss;
    }
    
    // Higher profit targets
    if (strategy.currentParameters.take_profit) {
      const newTakeProfit = strategy.currentParameters.take_profit * 1.2;
      aggressiveAdjustments.push({
        parameter: 'take_profit',
        change: newTakeProfit,
        reason: `Higher targets for favorable ${regime.type} market`
      });
      strategy.currentParameters.take_profit = newTakeProfit;
    }
    
    this.recordRegimeAdjustments(strategy, aggressiveAdjustments, regime);
  }
  
  private recordRegimeAdjustments(strategy: StrategyEvolution, adjustments: any[], regime: MarketRegime): void {
    adjustments.forEach(adj => {
      strategy.evolutionHistory.push({
        timestamp: new Date(),
        change: `${adj.parameter} adjusted for ${regime.type} market regime`,
        reason: adj.reason,
        performance: { before: 0, after: 0 }
      });
    });
  }
  
  private updateMarketConditionPerformance(strategy: StrategyEvolution, outcome: any): void {
    const condition = outcome.market_condition || 'unknown';
    
    let conditionPerf = strategy.marketConditionPerformance[condition];
    if (!conditionPerf) {
      conditionPerf = {
        winRate: 0,
        avgReturn: 0,
        volatility: 0,
        adaptations: 0
      };
    }
    
    // Update performance metrics
    const isWin = outcome.realized_pnl > 0 ? 1 : 0;
    conditionPerf.winRate = (conditionPerf.winRate * 0.9) + (isWin * 0.1);
    conditionPerf.avgReturn = (conditionPerf.avgReturn * 0.9) + (outcome.realized_pnl * 0.1);
    
    strategy.marketConditionPerformance[condition] = conditionPerf;
  }
  
  private learnFromComparison(comparison: any): void {
    // Learn from comparing different strategies on same data
    const { strategyA, strategyB, winner, performance } = comparison;
    
    const winningStrategy = this.strategies.get(winner);
    const losingStrategy = this.strategies.get(winner === strategyA ? strategyB : strategyA);
    
    if (winningStrategy && losingStrategy) {
      // Analyze what made the winner successful
      this.analyzeWinningFactors(winningStrategy, losingStrategy, performance);
    }
  }
  
  private analyzeWinningFactors(winner: StrategyEvolution, loser: StrategyEvolution, performance: any): void {
    // Compare parameters and identify key differences
    const winnerParams = winner.currentParameters;
    const loserParams = loser.currentParameters;
    
    // If winner has tighter stops and better performance, that's a good sign
    if (winnerParams.stop_loss < loserParams.stop_loss && performance.winnerWinRate > performance.loserWinRate) {
      // Consider adjusting loser's stop loss
      const suggestion = {
        strategy: loser.strategyId,
        parameter: 'stop_loss',
        suggestedValue: winnerParams.stop_loss,
        reason: 'Winning strategy uses tighter stops with better results',
        confidence: 0.7
      };
      
      eventBus.emit('strategy.suggestion', suggestion);
    }
    
    // Similar analysis for other parameters...
  }
  
  private recordManualAdjustment(adjustment: any): void {
    const strategy = this.strategies.get(adjustment.strategyId);
    if (!strategy) return;
    
    // Record the manual adjustment
    strategy.evolutionHistory.push({
      timestamp: new Date(),
      change: `Manual adjustment: ${adjustment.parameter} = ${adjustment.value}`,
      reason: adjustment.reason || 'Manual user adjustment',
      performance: { before: 0, after: 0 }
    });
    
    // Apply the adjustment
    strategy.currentParameters[adjustment.parameter] = adjustment.value;
    strategy.learningMetrics.adaptationCount++;
  }
  
  // Calculation helpers
  private calculatePerformance(history: any[]): number {
    if (history.length === 0) return 0.5;
    
    const winRate = history.filter(h => h.pnl > 0).length / history.length;
    const avgPnL = history.reduce((sum, h) => sum + h.pnl, 0) / history.length;
    const avgDrawdown = history.reduce((sum, h) => sum + (h.maxDrawdown || 0), 0) / history.length;
    
    // Combined performance score (0-1)
    return (winRate * 0.4) + (Math.max(0, avgPnL / 100) * 0.4) + (Math.max(0, 0.1 - avgDrawdown) / 0.1 * 0.2);
  }
  
  private calculateRecentPerformance(history: any[]): number {
    return this.calculatePerformance(history.slice(-10));
  }
  
  // Public API
  public getStrategy(strategyId: string): StrategyEvolution | null {
    return this.strategies.get(strategyId) || null;
  }
  
  public getAllStrategies(): StrategyEvolution[] {
    return Array.from(this.strategies.values());
  }
  
  public getTopPerformingStrategies(limit: number = 5): StrategyEvolution[] {
    return Array.from(this.strategies.values())
      .sort((a, b) => b.learningMetrics.overallPerformance - a.learningMetrics.overallPerformance)
      .slice(0, limit);
  }
  
  public getStrategiesForMarketCondition(condition: string): StrategyEvolution[] {
    return Array.from(this.strategies.values())
      .filter(s => s.marketConditionPerformance[condition]?.winRate > 0.6)
      .sort((a, b) => 
        (b.marketConditionPerformance[condition]?.winRate || 0) - 
        (a.marketConditionPerformance[condition]?.winRate || 0)
      );
  }
  
  public createCustomStrategy(config: any): string {
    const strategyId = generateULID();
    
    const strategy: StrategyEvolution = {
      strategyId,
      name: config.name || 'Custom Strategy',
      originalParameters: { ...config.parameters },
      currentParameters: { ...config.parameters },
      evolutionHistory: [{
        timestamp: new Date(),
        change: 'Strategy created',
        reason: 'User-created custom strategy',
        performance: { before: 0, after: 0 }
      }],
      learningMetrics: {
        adaptationCount: 0,
        improvementRate: 0,
        stabilityScore: 1.0,
        overallPerformance: 0.5
      },
      marketConditionPerformance: {},
      userSpecificLearning: {}
    };
    
    this.strategies.set(strategyId, strategy);
    return strategyId;
  }
  
  public getStrategyRecommendations(marketCondition?: string): any[] {
    const topStrategies = marketCondition 
      ? this.getStrategiesForMarketCondition(marketCondition)
      : this.getTopPerformingStrategies();
    
    return topStrategies.map(strategy => ({
      strategyId: strategy.strategyId,
      name: strategy.name,
      confidence: strategy.learningMetrics.overallPerformance,
      expectedReturn: this.estimateExpectedReturn(strategy, marketCondition),
      riskLevel: this.estimateRiskLevel(strategy),
      reasoning: this.generateRecommendationReason(strategy, marketCondition)
    }));
  }
  
  private estimateExpectedReturn(strategy: StrategyEvolution, condition?: string): number {
    if (condition && strategy.marketConditionPerformance[condition]) {
      return strategy.marketConditionPerformance[condition].avgReturn;
    }
    return strategy.learningMetrics.overallPerformance * 0.1; // Mock estimate
  }
  
  private estimateRiskLevel(strategy: StrategyEvolution): number {
    // Estimate based on stop loss and historical volatility
    const stopLoss = strategy.currentParameters.stop_loss || 0.05;
    return Math.min(1.0, stopLoss * 10); // Simple risk estimation
  }
  
  private generateRecommendationReason(strategy: StrategyEvolution, condition?: string): string {
    const performance = strategy.learningMetrics.overallPerformance;
    const adaptations = strategy.learningMetrics.adaptationCount;
    
    let reason = `${strategy.name} shows ${performance > 0.6 ? 'strong' : 'moderate'} performance`;
    
    if (adaptations > 5) {
      reason += ` and has been well-optimized through ${adaptations} adaptations`;
    }
    
    if (condition && strategy.marketConditionPerformance[condition]) {
      const condPerf = strategy.marketConditionPerformance[condition];
      reason += `. Particularly effective in ${condition} conditions with ${(condPerf.winRate * 100).toFixed(0)}% win rate`;
    }
    
    return reason;
  }
}

export const strategyLearning = new StrategyLearningSystem();
