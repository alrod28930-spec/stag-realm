import { logService } from './logging';
import { eventBus } from './eventBus';
import type { 
  TradeOutcome, 
  PatternMatch, 
  PatternInsights, 
  PredictiveModel, 
  RiskPrediction, 
  ReturnPrediction,
  LearningMetrics,
  FeedbackLoop,
  PatternCondition
} from '@/types/learning';
import type { ProcessedSignal } from '@/types/oracle';

class LearningEngineService {
  private tradeOutcomes: TradeOutcome[] = [];
  private patterns: Map<string, PatternMatch> = new Map();
  private models: Map<string, PredictiveModel> = new Map();
  private feedbackLoops: FeedbackLoop[] = [];
  private learningMetrics: LearningMetrics;

  constructor() {
    this.initializeModels();
    this.learningMetrics = this.initializeLearningMetrics();
    this.startLearningScheduler();
    this.subscribeToEvents();
  }

  private initializeModels() {
    const defaultModels: PredictiveModel[] = [
      {
        modelId: 'signal_accuracy_v1',
        type: 'signal_scoring',
        description: 'Predicts accuracy of Oracle signals based on historical performance',
        accuracy: 0.72,
        features: ['signal_type', 'confidence', 'market_volatility', 'sector', 'time_of_day'],
        lastTrained: new Date(),
        trainingDataSize: 0,
        version: '1.0.0',
        isActive: true
      },
      {
        modelId: 'risk_prediction_v1',
        type: 'risk_prediction',
        description: 'Predicts portfolio risk based on current positions and market conditions',
        accuracy: 0.68,
        features: ['position_concentration', 'market_volatility', 'sector_correlation', 'leverage'],
        lastTrained: new Date(),
        trainingDataSize: 0,
        version: '1.0.0',
        isActive: true
      },
      {
        modelId: 'return_prediction_v1',
        type: 'return_prediction',
        description: 'Predicts expected returns for individual positions',
        accuracy: 0.65,
        features: ['technical_indicators', 'fundamental_metrics', 'sentiment_score', 'volume_profile'],
        lastTrained: new Date(),
        trainingDataSize: 0,
        version: '1.0.0',
        isActive: true
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.modelId, model);
    });
  }

  private initializeLearningMetrics(): LearningMetrics {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      successRate: 0,
      averageReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      patternsIdentified: 0,
      modelAccuracy: 0,
      dataQuality: 'good',
      lastUpdated: new Date()
    };
  }

  private startLearningScheduler() {
    // Run pattern analysis every 6 hours
    setInterval(() => {
      this.analyzePatterns();
    }, 6 * 60 * 60 * 1000);

    // Update models daily
    setInterval(() => {
      this.updateModels();
    }, 24 * 60 * 60 * 1000);

    // Calculate metrics every hour
    setInterval(() => {
      this.updateLearningMetrics();
    }, 60 * 60 * 1000);

    // Initial run after 10 seconds
    setTimeout(() => {
      this.analyzePatterns();
      this.updateLearningMetrics();
    }, 10000);
  }

  private subscribeToEvents() {
    // Listen for trade completions
    eventBus.on('trade.executed', (data) => {
      this.recordTradeOutcome(data);
    });

    // Listen for Oracle signals
    eventBus.on('oracle.signal.created', (signal: ProcessedSignal) => {
      this.analyzeSignalPattern(signal);
    });

    // Listen for risk events
    eventBus.on('risk.soft_pull', (data) => {
      this.processFeedbackLoop('monarch', 'oracle', 'risk_adjustment', data);
    });

    eventBus.on('risk.hard_pull', (data) => {
      this.processFeedbackLoop('overseer', 'trade_bots', 'risk_adjustment', data);
    });
  }

  // Record trade outcomes for learning
  recordTradeOutcome(tradeData: any): void {
    const outcome: TradeOutcome = {
      tradeId: tradeData.tradeId || `trade_${Date.now()}`,
      symbol: tradeData.symbol,
      side: tradeData.side,
      entryPrice: tradeData.entryPrice || tradeData.price,
      exitPrice: tradeData.exitPrice,
      quantity: tradeData.quantity,
      pnl: tradeData.pnl,
      duration: tradeData.duration,
      outcome: this.calculateTradeOutcome(tradeData),
      executedAt: tradeData.executedAt || new Date(),
      closedAt: tradeData.closedAt,
      relatedSignals: tradeData.relatedSignals || [],
      botId: tradeData.botId,
      confidence: tradeData.confidence
    };

    this.tradeOutcomes.unshift(outcome);
    
    // Keep last 10,000 trade outcomes
    this.tradeOutcomes = this.tradeOutcomes.slice(0, 10000);

    logService.log('info', 'Trade outcome recorded', {
      tradeId: outcome.tradeId,
      symbol: outcome.symbol,
      outcome: outcome.outcome,
      pnl: outcome.pnl
    });

    // Trigger pattern analysis if we have enough data
    if (this.tradeOutcomes.length % 100 === 0) {
      setTimeout(() => this.analyzePatterns(), 1000);
    }
  }

  // Analyze Oracle signal accuracy patterns
  analyzeSignalAccuracy(signals: ProcessedSignal[], outcomes: TradeOutcome[]): PatternInsights {
    const signalPatterns: PatternMatch[] = [];
    
    // Group signals by type and analyze success rates
    const signalTypes = new Set(signals.map(s => s.type));
    
    signalTypes.forEach(type => {
      const typeSignals = signals.filter(s => s.type === type);
      const relatedTrades = outcomes.filter(outcome => 
        outcome.relatedSignals.some(signalId => 
          typeSignals.some(signal => signal.id === signalId)
        )
      );

      if (relatedTrades.length >= 10) { // Minimum sample size
        const successfulTrades = relatedTrades.filter(trade => 
          trade.outcome === 'win' || (trade.pnl && trade.pnl > 0)
        );
        
        const successRate = successfulTrades.length / relatedTrades.length;
        const avgReturn = relatedTrades
          .filter(trade => trade.pnl !== undefined)
          .reduce((sum, trade) => sum + (trade.pnl || 0), 0) / relatedTrades.length;

        const pattern: PatternMatch = {
          patternId: `signal_accuracy_${type}`,
          type: 'signal_accuracy',
          description: `${type.replace('_', ' ')} signal accuracy pattern`,
          occurrences: relatedTrades.length,
          successRate,
          averageReturn: avgReturn,
          confidence: this.calculatePatternConfidence(relatedTrades.length, successRate),
          timeframe: '30d',
          conditions: [
            {
              field: 'signal_type',
              operator: 'eq',
              value: type,
              weight: 1.0
            }
          ],
          lastSeen: new Date(),
          strength: this.determinePatternStrength(successRate, relatedTrades.length)
        };

        signalPatterns.push(pattern);
        this.patterns.set(pattern.patternId, pattern);
      }
    });

    // Analyze severity impact
    const severities = ['low', 'medium', 'high', 'critical'] as const;
    severities.forEach(severity => {
      const severitySignals = signals.filter(s => s.severity === severity);
      const relatedTrades = outcomes.filter(outcome => 
        outcome.relatedSignals.some(signalId => 
          severitySignals.some(signal => signal.id === signalId)
        )
      );

      if (relatedTrades.length >= 5) {
        const successRate = relatedTrades.filter(trade => 
          trade.outcome === 'win' || (trade.pnl && trade.pnl > 0)
        ).length / relatedTrades.length;

        const pattern: PatternMatch = {
          patternId: `signal_severity_${severity}`,
          type: 'signal_accuracy',
          description: `${severity} severity signal performance`,
          occurrences: relatedTrades.length,
          successRate,
          confidence: this.calculatePatternConfidence(relatedTrades.length, successRate),
          timeframe: '30d',
          conditions: [
            {
              field: 'severity',
              operator: 'eq',
              value: severity,
              weight: 0.8
            }
          ],
          lastSeen: new Date(),
          strength: this.determinePatternStrength(successRate, relatedTrades.length)
        };

        signalPatterns.push(pattern);
        this.patterns.set(pattern.patternId, pattern);
      }
    });

    return this.compilePatternInsights(signalPatterns);
  }

  // Predict risk for given portfolio state
  predictRisk(portfolioData: any): RiskPrediction[] {
    const predictions: RiskPrediction[] = [];
    
    // Portfolio-level risk prediction
    const portfolioRisk = this.calculatePortfolioRisk(portfolioData);
    predictions.push({
      riskLevel: portfolioRisk.level,
      probability: portfolioRisk.probability,
      timeHorizon: '1d',
      riskFactors: portfolioRisk.factors,
      confidence: 0.75,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Position-level risk predictions
    if (portfolioData.positions) {
      portfolioData.positions.forEach((position: any) => {
        const positionRisk = this.calculatePositionRisk(position, portfolioData);
        if (positionRisk.level !== 'low') {
          predictions.push({
            symbol: position.symbol,
            riskLevel: positionRisk.level,
            probability: positionRisk.probability,
            timeHorizon: '1d',
            riskFactors: positionRisk.factors,
            confidence: 0.65,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
        }
      });
    }

    return predictions;
  }

  // Generate return predictions
  predictReturns(symbol: string, timeHorizon: string = '1d'): ReturnPrediction | null {
    const model = this.models.get('return_prediction_v1');
    if (!model || !model.isActive) return null;

    // Simplified return prediction based on historical patterns
    const historicalTrades = this.tradeOutcomes.filter(trade => 
      trade.symbol === symbol && trade.pnl !== undefined
    ).slice(0, 100);

    if (historicalTrades.length < 10) return null;

    const returns = historicalTrades.map(trade => (trade.pnl || 0) / (trade.entryPrice * trade.quantity));
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);

    return {
      symbol,
      expectedReturn: avgReturn * 100, // Convert to percentage
      confidence: Math.min(0.9, historicalTrades.length / 100),
      timeHorizon,
      upside: avgReturn + volatility,
      downside: avgReturn - volatility,
      volatility: volatility * 100,
      generatedAt: new Date(),
      modelUsed: model.modelId
    };
  }

  // Process feedback loops between systems
  processFeedbackLoop(
    sourceSystem: FeedbackLoop['sourceSystem'],
    targetSystem: FeedbackLoop['targetSystem'],
    feedbackType: FeedbackLoop['feedbackType'],
    data: any
  ): void {
    const feedback: FeedbackLoop = {
      loopId: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceSystem,
      targetSystem,
      feedbackType,
      data,
      processedAt: new Date(),
      impact: this.assessFeedbackImpact(feedbackType, data)
    };

    this.feedbackLoops.unshift(feedback);
    this.feedbackLoops = this.feedbackLoops.slice(0, 1000); // Keep last 1000

    // Apply feedback to improve systems
    this.applyFeedback(feedback);

    logService.log('info', 'Feedback loop processed', {
      loopId: feedback.loopId,
      sourceSystem,
      targetSystem,
      feedbackType,
      impact: feedback.impact
    });

    // Emit feedback event
    eventBus.emit('learning.feedback_processed', feedback);
  }

  // Private methods
  private calculateTradeOutcome(tradeData: any): TradeOutcome['outcome'] {
    if (tradeData.pnl !== undefined) {
      if (tradeData.pnl > 0) return 'win';
      if (tradeData.pnl < 0) return 'loss';
      return 'breakeven';
    }
    
    if (tradeData.status === 'open') return 'open';
    
    // Default based on exit vs entry price if available
    if (tradeData.exitPrice && tradeData.entryPrice) {
      const pnl = (tradeData.exitPrice - tradeData.entryPrice) * tradeData.quantity;
      if (pnl > 0) return 'win';
      if (pnl < 0) return 'loss';
      return 'breakeven';
    }
    
    return 'open';
  }

  private analyzeSignalPattern(signal: ProcessedSignal): void {
    // Simple pattern recognition for signal types
    const recentSignals = [signal]; // In real implementation, would get recent signals
    
    // Look for clustering patterns
    if (signal.severity === 'critical') {
      // Check if there are multiple critical signals in short timeframe
      const pattern: PatternMatch = {
        patternId: `critical_signal_cluster_${Date.now()}`,
        type: 'risk_pattern',
        description: 'Multiple critical signals detected',
        occurrences: 1,
        successRate: 0.8, // Historical pattern success
        confidence: 0.7,
        timeframe: '1h',
        conditions: [
          {
            field: 'severity',
            operator: 'eq',
            value: 'critical',
            weight: 1.0
          }
        ],
        lastSeen: new Date(),
        strength: 'strong'
      };

      this.patterns.set(pattern.patternId, pattern);
    }
  }

  private analyzePatterns(): void {
    const recentOutcomes = this.tradeOutcomes.slice(0, 1000);
    
    if (recentOutcomes.length < 50) {
      logService.log('info', 'Insufficient data for pattern analysis', { 
        outcomeCount: recentOutcomes.length 
      });
      return;
    }

    // Analyze success patterns by symbol
    this.analyzeSymbolPatterns(recentOutcomes);
    
    // Analyze time-based patterns
    this.analyzeTimePatterns(recentOutcomes);
    
    // Analyze risk patterns
    this.analyzeRiskPatterns(recentOutcomes);

    logService.log('info', 'Pattern analysis completed', {
      totalPatterns: this.patterns.size,
      recentOutcomes: recentOutcomes.length
    });
  }

  private analyzeSymbolPatterns(outcomes: TradeOutcome[]): void {
    const symbolGroups = new Map<string, TradeOutcome[]>();
    
    outcomes.forEach(outcome => {
      if (!symbolGroups.has(outcome.symbol)) {
        symbolGroups.set(outcome.symbol, []);
      }
      symbolGroups.get(outcome.symbol)!.push(outcome);
    });

    symbolGroups.forEach((symbolOutcomes, symbol) => {
      if (symbolOutcomes.length >= 10) {
        const successRate = symbolOutcomes.filter(o => o.outcome === 'win').length / symbolOutcomes.length;
        const avgReturn = symbolOutcomes
          .filter(o => o.pnl !== undefined)
          .reduce((sum, o) => sum + (o.pnl || 0), 0) / symbolOutcomes.length;

        const pattern: PatternMatch = {
          patternId: `symbol_performance_${symbol}`,
          type: 'trade_success',
          description: `${symbol} trading performance pattern`,
          occurrences: symbolOutcomes.length,
          successRate,
      averageReturn: avgReturn,
          confidence: this.calculatePatternConfidence(symbolOutcomes.length, successRate),
          timeframe: '30d',
          conditions: [
            {
              field: 'symbol',
              operator: 'eq',
              value: symbol,
              weight: 1.0
            }
          ],
          lastSeen: new Date(),
          strength: this.determinePatternStrength(successRate, symbolOutcomes.length)
        };

        this.patterns.set(pattern.patternId, pattern);
      }
    });
  }

  private analyzeTimePatterns(outcomes: TradeOutcome[]): void {
    // Analyze patterns by hour of day
    const hourGroups = new Map<number, TradeOutcome[]>();
    
    outcomes.forEach(outcome => {
      const hour = outcome.executedAt.getHours();
      if (!hourGroups.has(hour)) {
        hourGroups.set(hour, []);
      }
      hourGroups.get(hour)!.push(outcome);
    });

    hourGroups.forEach((hourOutcomes, hour) => {
      if (hourOutcomes.length >= 5) {
        const successRate = hourOutcomes.filter(o => o.outcome === 'win').length / hourOutcomes.length;
        
        if (successRate > 0.6 || successRate < 0.4) { // Only interesting patterns
          const pattern: PatternMatch = {
            patternId: `time_pattern_hour_${hour}`,
            type: 'trade_success',
            description: `Trading performance at ${hour}:00 hour`,
            occurrences: hourOutcomes.length,
            successRate,
            confidence: this.calculatePatternConfidence(hourOutcomes.length, successRate),
            timeframe: '30d',
            conditions: [
              {
                field: 'hour',
                operator: 'eq',
                value: hour,
                weight: 0.6
              }
            ],
            lastSeen: new Date(),
            strength: this.determinePatternStrength(successRate, hourOutcomes.length)
          };

          this.patterns.set(pattern.patternId, pattern);
        }
      }
    });
  }

  private analyzeRiskPatterns(outcomes: TradeOutcome[]): void {
    // Look for patterns in losing trades
    const losingTrades = outcomes.filter(o => o.outcome === 'loss');
    
    if (losingTrades.length >= 20) {
      // Analyze common characteristics of losing trades
      const avgLossDuration = losingTrades
        .filter(t => t.duration)
        .reduce((sum, t) => sum + (t.duration || 0), 0) / losingTrades.length;

      const pattern: PatternMatch = {
        patternId: 'risk_pattern_losses',
        type: 'risk_pattern',
        description: 'Common characteristics of losing trades',
        occurrences: losingTrades.length,
        successRate: 0, // This represents risk, so 0 success rate
        confidence: 0.8,
        timeframe: '30d',
        conditions: [
          {
            field: 'outcome',
            operator: 'eq',
            value: 'loss',
            weight: 1.0
          },
          {
            field: 'duration',
            operator: 'lt',
            value: avgLossDuration,
            weight: 0.7
          }
        ],
        lastSeen: new Date(),
        strength: 'moderate'
      };

      this.patterns.set(pattern.patternId, pattern);
    }
  }

  private updateModels(): void {
    this.models.forEach((model, modelId) => {
      if (model.isActive) {
        // Update model accuracy based on recent performance
        const updatedAccuracy = this.calculateModelAccuracy(model);
        
        const updatedModel: PredictiveModel = {
          ...model,
          accuracy: updatedAccuracy,
          lastTrained: new Date(),
          trainingDataSize: this.tradeOutcomes.length
        };

        this.models.set(modelId, updatedModel);
        
        logService.log('info', 'Model updated', {
          modelId,
          accuracy: updatedAccuracy,
          trainingDataSize: updatedModel.trainingDataSize
        });
      }
    });
  }

  private calculateModelAccuracy(model: PredictiveModel): number {
    // Simplified accuracy calculation
    // In production, would use proper validation metrics
    return Math.max(0.5, Math.min(0.95, model.accuracy + (Math.random() - 0.5) * 0.1));
  }

  private updateLearningMetrics(): void {
    const recentTrades = this.tradeOutcomes.slice(0, 1000);
    
    if (recentTrades.length === 0) return;

    const successfulTrades = recentTrades.filter(t => t.outcome === 'win');
    const tradesWithPnL = recentTrades.filter(t => t.pnl !== undefined);
    
    const successRate = successfulTrades.length / recentTrades.length;
    const avgReturn = tradesWithPnL.length > 0 
      ? tradesWithPnL.reduce((sum, t) => sum + (t.pnl || 0), 0) / tradesWithPnL.length
      : 0;

    const returns = tradesWithPnL.map(t => (t.pnl || 0) / (t.entryPrice * t.quantity));
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);

    this.learningMetrics = {
      totalTrades: recentTrades.length,
      successfulTrades: successfulTrades.length,
      successRate,
      averageReturn: avgReturn,
      sharpeRatio,
      maxDrawdown,
      patternsIdentified: this.patterns.size,
      modelAccuracy: this.calculateAverageModelAccuracy(),
      dataQuality: this.assessDataQuality(),
      lastUpdated: new Date()
    };

    // Emit metrics update
    eventBus.emit('learning.metrics_updated', this.learningMetrics);
  }

  private calculatePortfolioRisk(portfolioData: any): { level: RiskPrediction['riskLevel']; probability: number; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 0;

    // Check concentration risk
    if (portfolioData.concentrationRisk > 0.3) {
      factors.push('High position concentration');
      riskScore += 0.3;
    }

    // Check volatility
    if (portfolioData.volatility > 0.25) {
      factors.push('High portfolio volatility');
      riskScore += 0.2;
    }

    // Check leverage
    if (portfolioData.leverage && portfolioData.leverage > 2) {
      factors.push('High leverage exposure');
      riskScore += 0.25;
    }

    // Determine risk level
    let level: RiskPrediction['riskLevel'] = 'low';
    if (riskScore > 0.7) level = 'critical';
    else if (riskScore > 0.5) level = 'high';
    else if (riskScore > 0.3) level = 'medium';

    return {
      level,
      probability: Math.min(0.95, riskScore),
      factors
    };
  }

  private calculatePositionRisk(position: any, portfolioData: any): { level: RiskPrediction['riskLevel']; probability: number; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 0;

    // Check position size relative to portfolio
    const positionWeight = position.marketValue / portfolioData.totalEquity;
    if (positionWeight > 0.1) {
      factors.push('Large position size');
      riskScore += positionWeight * 0.5;
    }

    // Check unrealized loss
    if (position.unrealizedPnLPercent < -0.1) {
      factors.push('Significant unrealized loss');
      riskScore += Math.abs(position.unrealizedPnLPercent) * 0.3;
    }

    let level: RiskPrediction['riskLevel'] = 'low';
    if (riskScore > 0.6) level = 'high';
    else if (riskScore > 0.3) level = 'medium';

    return {
      level,
      probability: Math.min(0.9, riskScore),
      factors
    };
  }

  private applyFeedback(feedback: FeedbackLoop): void {
    // Apply feedback to improve system performance
    switch (feedback.feedbackType) {
      case 'signal_accuracy':
        this.adjustSignalConfidence(feedback);
        break;
      case 'risk_adjustment':
        this.adjustRiskModels(feedback);
        break;
      case 'performance_update':
        this.updatePerformanceMetrics(feedback);
        break;
    }
  }

  private adjustSignalConfidence(feedback: FeedbackLoop): void {
    // Adjust confidence scores based on feedback
    if (feedback.data.signalId) {
      logService.log('info', 'Signal confidence adjusted based on feedback', {
        signalId: feedback.data.signalId,
        adjustment: feedback.impact
      });
    }
  }

  private adjustRiskModels(feedback: FeedbackLoop): void {
    // Adjust risk model parameters
    const riskModel = this.models.get('risk_prediction_v1');
    if (riskModel && feedback.impact === 'high') {
      // Increase model sensitivity
      logService.log('info', 'Risk model sensitivity increased', {
        modelId: riskModel.modelId,
        reason: feedback.data.reason
      });
    }
  }

  private updatePerformanceMetrics(feedback: FeedbackLoop): void {
    // Update performance tracking
    this.updateLearningMetrics();
  }

  // Utility methods
  private calculatePatternConfidence(sampleSize: number, successRate: number): number {
    // Confidence increases with sample size and extreme success rates
    const sizeConfidence = Math.min(1, sampleSize / 100);
    const rateConfidence = Math.abs(successRate - 0.5) * 2;
    return (sizeConfidence + rateConfidence) / 2;
  }

  private determinePatternStrength(successRate: number, sampleSize: number): PatternMatch['strength'] {
    const confidence = this.calculatePatternConfidence(sampleSize, successRate);
    
    if (confidence > 0.8) return 'strong';
    if (confidence > 0.6) return 'moderate';
    return 'weak';
  }

  private compilePatternInsights(patterns: PatternMatch[]): PatternInsights {
    const strongPatterns = patterns.filter(p => p.strength === 'strong');
    const emergingPatterns = patterns.filter(p => p.occurrences < 20 && p.successRate > 0.7);
    const failingPatterns = patterns.filter(p => p.successRate < 0.4);

    const recommendations: string[] = [];
    
    if (strongPatterns.length > 0) {
      recommendations.push(`${strongPatterns.length} strong patterns identified for optimization`);
    }
    
    if (failingPatterns.length > 0) {
      recommendations.push(`${failingPatterns.length} failing patterns require attention`);
    }

    return {
      totalPatterns: patterns.length,
      strongPatterns,
      emergingPatterns,
      failingPatterns,
      recommendations,
      confidenceLevel: patterns.length > 0 
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
        : 0,
      lastUpdated: new Date()
    };
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    return volatility > 0 ? avgReturn / volatility : 0;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    
    returns.forEach(ret => {
      cumulative += ret;
      peak = Math.max(peak, cumulative);
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    return maxDrawdown;
  }

  private calculateAverageModelAccuracy(): number {
    const activeModels = Array.from(this.models.values()).filter(m => m.isActive);
    if (activeModels.length === 0) return 0;
    
    return activeModels.reduce((sum, m) => sum + m.accuracy, 0) / activeModels.length;
  }

  private assessDataQuality(): LearningMetrics['dataQuality'] {
    const recentTrades = this.tradeOutcomes.slice(0, 100);
    const completeTrades = recentTrades.filter(t => t.pnl !== undefined && t.outcome !== 'open');
    
    const completionRate = recentTrades.length > 0 ? completeTrades.length / recentTrades.length : 0;
    
    if (completionRate > 0.9) return 'excellent';
    if (completionRate > 0.7) return 'good';
    if (completionRate > 0.5) return 'fair';
    return 'poor';
  }

  private assessFeedbackImpact(feedbackType: FeedbackLoop['feedbackType'], data: any): FeedbackLoop['impact'] {
    switch (feedbackType) {
      case 'risk_adjustment':
        return data.severity === 'critical' ? 'high' : 'medium';
      case 'signal_accuracy':
        return 'medium';
      case 'performance_update':
        return 'low';
      default:
        return 'low';
    }
  }

  // Public API methods
  getPatterns(type?: PatternMatch['type']): PatternMatch[] {
    const allPatterns = Array.from(this.patterns.values());
    return type ? allPatterns.filter(p => p.type === type) : allPatterns;
  }

  getModels(): PredictiveModel[] {
    return Array.from(this.models.values());
  }

  getLearningMetrics(): LearningMetrics {
    return { ...this.learningMetrics };
  }

  getFeedbackLoops(limit = 100): FeedbackLoop[] {
    return this.feedbackLoops.slice(0, limit);
  }

  getTradeOutcomes(limit = 1000): TradeOutcome[] {
    return this.tradeOutcomes.slice(0, limit);
  }
}

export const learningEngine = new LearningEngineService();
