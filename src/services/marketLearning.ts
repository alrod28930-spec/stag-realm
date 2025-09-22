// Market Learning System - Learns patterns, regimes, and behaviors from market data

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { MarketPattern, MarketRegime, MarketLesson } from '@/types/marketIntelligence';

export class MarketLearningSystem {
  private patterns: Map<string, MarketPattern> = new Map();
  private regimes: MarketRegime[] = [];
  private lessons: Map<string, MarketLesson> = new Map();
  private currentRegime: MarketRegime | null = null;
  
  // Learning parameters
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MIN_OCCURRENCES = 5;
  private readonly LEARNING_DECAY = 0.95; // How fast old lessons decay
  
  constructor() {
    this.initializeEventListeners();
    this.initializeBasicPatterns();
  }
  
  private initializeEventListeners(): void {
    // Learn from market data
    eventBus.on('bid.candle_stored', (candle) => {
      this.analyzeMarketData(candle);
    });
    
    // Learn from trade outcomes
    eventBus.on('trade.closed', (outcome) => {
      this.learnFromTradeOutcome(outcome);
    });
    
    // Learn from oracle signals
    eventBus.on('oracle.signal.generated', (signal) => {
      this.analyzeSignalEffectiveness(signal);
    });
    
    // Learn from user decisions
    eventBus.on('user.decision', (decision) => {
      this.learnFromUserDecision(decision);
    });
  }
  
  private initializeBasicPatterns(): void {
    // Initialize with basic market patterns
    const basicPatterns: Partial<MarketPattern>[] = [
      {
        type: 'breakout',
        timeframe: '1h',
        confidence: 0.6,
        successRate: 0.65,
        conditions: {
          technical: { rsi: 70, volume: 1.5 } // Above 70 RSI with 1.5x volume
        },
        expectedMoves: [{
          probability: 0.65,
          direction: 'up',
          magnitude: 0.03, // 3% move expected
          timeframe: 4 // 4 hours
        }]
      },
      {
        type: 'reversal',
        timeframe: '1d',
        confidence: 0.55,
        successRate: 0.58,
        conditions: {
          technical: { rsi: 30, ma20_distance: -0.05 } // Oversold with 5% below MA20
        },
        expectedMoves: [{
          probability: 0.58,
          direction: 'up',
          magnitude: 0.05, // 5% recovery expected
          timeframe: 48 // 2 days
        }]
      }
    ];
    
    basicPatterns.forEach((pattern, index) => {
      const fullPattern: MarketPattern = {
        id: `basic_${index}`,
        ...pattern,
        relatedSymbols: [],
        sectorImpact: {},
        createdAt: new Date(),
        lastSeen: new Date(),
        occurrenceCount: 0
      } as MarketPattern;
      
      this.patterns.set(fullPattern.id, fullPattern);
    });
  }
  
  private analyzeMarketData(candle: any): void {
    // Detect patterns in real-time market data
    this.detectBreakoutPatterns(candle);
    this.detectReversalPatterns(candle);
    this.updateMarketRegime(candle);
  }
  
  private detectBreakoutPatterns(candle: any): void {
    // Look for volume breakouts, price breakouts, etc.
    if (candle.v > candle.avgVolume * 2 && candle.c > candle.h_20d) {
      const patternId = `breakout_${candle.symbol}_${Date.now()}`;
      
      let pattern = this.patterns.get('volume_breakout');
      if (!pattern) {
        pattern = {
          id: 'volume_breakout',
          type: 'breakout',
          timeframe: candle.tf,
          confidence: 0.5,
          successRate: 0.5,
          conditions: {
            technical: { volume_ratio: 2.0, price_vs_high20: 1.0 }
          },
          expectedMoves: [{
            probability: 0.6,
            direction: 'up',
            magnitude: 0.025,
            timeframe: 6
          }],
          relatedSymbols: [],
          sectorImpact: {},
          createdAt: new Date(),
          lastSeen: new Date(),
          occurrenceCount: 1
        };
      } else {
        pattern.occurrenceCount++;
        pattern.lastSeen = new Date();
      }
      
      this.patterns.set('volume_breakout', pattern);
      
      // Emit pattern detection
      eventBus.emit('market.pattern_detected', {
        pattern,
        symbol: candle.symbol,
        confidence: pattern.confidence
      });
    }
  }
  
  private detectReversalPatterns(candle: any): void {
    // Look for reversal patterns - hammer, doji, engulfing, etc.
    const bodySize = Math.abs(candle.c - candle.o);
    const totalRange = candle.h - candle.l;
    const lowerWick = Math.min(candle.o, candle.c) - candle.l;
    
    // Hammer pattern detection
    if (lowerWick > bodySize * 2 && bodySize < totalRange * 0.3) {
      this.updatePattern('hammer_reversal', {
        type: 'reversal',
        conditions: {
          technical: {
            lower_wick_ratio: lowerWick / totalRange,
            body_ratio: bodySize / totalRange
          }
        },
        expectedMoves: [{
          probability: 0.62,
          direction: 'up',
          magnitude: 0.02,
          timeframe: 12
        }]
      });
    }
  }
  
  private updateMarketRegime(candle: any): void {
    // Analyze overall market conditions to determine regime
    // This would use VIX, correlations, momentum indicators, etc.
    
    const volatility = this.calculateRecentVolatility();
    const momentum = this.calculateMarketMomentum();
    
    let newRegimeType: MarketRegime['type'] = 'sideways';
    
    if (volatility > 0.25) {
      newRegimeType = 'volatile';
    } else if (momentum > 0.15) {
      newRegimeType = 'bull';
    } else if (momentum < -0.10) {
      newRegimeType = 'bear';
    } else if (volatility < 0.10) {
      newRegimeType = 'low_vol';
    }
    
    // Update current regime if changed
    if (!this.currentRegime || this.currentRegime.type !== newRegimeType) {
      if (this.currentRegime) {
        this.currentRegime.endDate = new Date();
        this.regimes.push(this.currentRegime);
      }
      
      this.currentRegime = {
        id: generateULID(),
        name: `${newRegimeType}_${Date.now()}`,
        type: newRegimeType,
        startDate: new Date(),
        characteristics: {
          volatility,
          correlation: 0.7, // Would calculate actual correlation
          momentum,
          meanReversion: 0.5
        },
        successfulStrategies: [],
        failedStrategies: [],
        keyIndicators: {
          vix: volatility * 100,
          spy_momentum: momentum
        },
        learningConfidence: 0.6
      };
      
      eventBus.emit('market.regime_changed', this.currentRegime);
    }
  }
  
  private learnFromTradeOutcome(outcome: any): void {
    // Learn what works and what doesn't in different market conditions
    const lessonId = `trade_${outcome.trade_id}_lesson`;
    
    const wasSuccessful = outcome.realized_pnl > 0;
    const strategy = outcome.strategy || 'unknown';
    
    if (this.currentRegime) {
      if (wasSuccessful) {
        if (!this.currentRegime.successfulStrategies.includes(strategy)) {
          this.currentRegime.successfulStrategies.push(strategy);
        }
      } else {
        if (!this.currentRegime.failedStrategies.includes(strategy)) {
          this.currentRegime.failedStrategies.push(strategy);
        }
      }
    }
    
    // Create market lesson
    const lesson: MarketLesson = {
      id: lessonId,
      type: 'strategy',
      lesson: wasSuccessful 
        ? `${strategy} works well in ${this.currentRegime?.type} conditions`
        : `${strategy} struggles in ${this.currentRegime?.type} conditions`,
      evidence: {
        occurrences: 1,
        successRate: wasSuccessful ? 1 : 0,
        avgOutcome: outcome.realized_pnl,
        timespan: 1
      },
      conditions: {
        regime: this.currentRegime?.type,
        volatility: this.currentRegime?.characteristics.volatility,
        momentum: this.currentRegime?.characteristics.momentum
      },
      actionable: wasSuccessful 
        ? `Consider increasing allocation to ${strategy} in similar conditions`
        : `Reduce or avoid ${strategy} in similar conditions`,
      confidence: 0.3, // Low initially, increases with more evidence
      importance: wasSuccessful ? 'medium' : 'high',
      createdAt: new Date(),
      lastValidated: new Date()
    };
    
    // Update existing lesson or create new one
    const existingLesson = Array.from(this.lessons.values())
      .find(l => l.lesson.includes(strategy) && l.conditions.regime === this.currentRegime?.type);
    
    if (existingLesson) {
      existingLesson.evidence.occurrences++;
      existingLesson.evidence.successRate = (
        (existingLesson.evidence.successRate * (existingLesson.evidence.occurrences - 1) + (wasSuccessful ? 1 : 0))
        / existingLesson.evidence.occurrences
      );
      existingLesson.evidence.avgOutcome = (
        (existingLesson.evidence.avgOutcome * (existingLesson.evidence.occurrences - 1) + outcome.realized_pnl)
        / existingLesson.evidence.occurrences
      );
      existingLesson.confidence = Math.min(0.9, existingLesson.confidence + 0.1);
      existingLesson.lastValidated = new Date();
    } else {
      this.lessons.set(lessonId, lesson);
    }
  }
  
  private analyzeSignalEffectiveness(signal: any): void {
    // Track Oracle signal accuracy and learn from it
    setTimeout(() => {
      // Check signal outcome after some time
      this.validateSignalOutcome(signal);
    }, signal.timeframe * 60 * 1000); // Wait for signal timeframe
  }
  
  private validateSignalOutcome(signal: any): void {
    // This would check if the signal's prediction was correct
    // and update our learning about signal effectiveness
    
    const wasCorrect = Math.random() > 0.4; // Mock - would calculate actual outcome
    
    const lesson: MarketLesson = {
      id: `signal_${signal.id}_lesson`,
      type: 'pattern',
      lesson: `${signal.type} signals have ${wasCorrect ? 'good' : 'poor'} accuracy in ${this.currentRegime?.type} regime`,
      evidence: {
        occurrences: 1,
        successRate: wasCorrect ? 1 : 0,
        avgOutcome: wasCorrect ? 0.02 : -0.01, // Mock outcome
        timespan: 1
      },
      conditions: {
        signalType: signal.type,
        regime: this.currentRegime?.type,
        strength: signal.strength
      },
      actionable: wasCorrect 
        ? `Trust ${signal.type} signals more in ${this.currentRegime?.type} conditions`
        : `Be cautious with ${signal.type} signals in ${this.currentRegime?.type} conditions`,
      confidence: 0.4,
      importance: 'medium',
      createdAt: new Date(),
      lastValidated: new Date()
    };
    
    this.lessons.set(lesson.id, lesson);
  }
  
  private learnFromUserDecision(decision: any): void {
    // Learn from user's decision-making patterns
    // This helps personalize recommendations
    
    const lesson: MarketLesson = {
      id: `user_${decision.userId}_${Date.now()}`,
      type: 'user_behavior',
      lesson: `User tends to ${decision.action} when ${decision.context}`,
      evidence: {
        occurrences: 1,
        successRate: decision.outcome ? 1 : 0,
        avgOutcome: decision.pnl || 0,
        timespan: 1
      },
      conditions: decision.conditions || {},
      actionable: decision.outcome 
        ? `Encourage similar decisions in similar contexts`
        : `Warn about similar decisions in similar contexts`,
      confidence: 0.2,
      importance: 'low',
      createdAt: new Date(),
      lastValidated: new Date(),
      userId: decision.userId
    };
    
    this.lessons.set(lesson.id, lesson);
  }
  
  // Utility methods
  private updatePattern(patternId: string, updates: Partial<MarketPattern>): void {
    let pattern = this.patterns.get(patternId);
    if (!pattern) {
      pattern = {
        id: patternId,
        type: updates.type || 'trend',
        timeframe: updates.timeframe || '1h',
        confidence: 0.5,
        successRate: 0.5,
        conditions: updates.conditions || { technical: {} },
        expectedMoves: updates.expectedMoves || [],
        relatedSymbols: [],
        sectorImpact: {},
        createdAt: new Date(),
        lastSeen: new Date(),
        occurrenceCount: 1
      };
    }
    
    // Update pattern with new data
    Object.assign(pattern, updates);
    pattern.occurrenceCount++;
    pattern.lastSeen = new Date();
    
    this.patterns.set(patternId, pattern);
  }
  
  private calculateRecentVolatility(): number {
    // Mock volatility calculation - would use actual price data
    return 0.15 + Math.random() * 0.10;
  }
  
  private calculateMarketMomentum(): number {
    // Mock momentum calculation - would use actual price momentum
    return (Math.random() - 0.5) * 0.4;
  }
  
  // Public API
  public getDetectedPatterns(): MarketPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.confidence > this.PATTERN_CONFIDENCE_THRESHOLD);
  }
  
  public getCurrentRegime(): MarketRegime | null {
    return this.currentRegime;
  }
  
  public getMarketLessons(userId?: string): MarketLesson[] {
    return Array.from(this.lessons.values())
      .filter(l => !userId || !l.userId || l.userId === userId)
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  public getCriticalLessons(): MarketLesson[] {
    return Array.from(this.lessons.values())
      .filter(l => l.importance === 'critical' && l.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  public getPatternForSymbol(symbol: string, patternType?: string): MarketPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => 
        p.relatedSymbols.includes(symbol) || p.relatedSymbols.length === 0
      )
      .filter(p => !patternType || p.type === patternType);
  }
  
  public learnFromManualInput(lesson: Partial<MarketLesson>): void {
    const fullLesson: MarketLesson = {
      id: generateULID(),
      type: lesson.type || 'pattern',
      lesson: lesson.lesson || '',
      evidence: lesson.evidence || {
        occurrences: 1,
        successRate: 0.5,
        avgOutcome: 0,
        timespan: 1
      },
      conditions: lesson.conditions || {},
      actionable: lesson.actionable || '',
      confidence: lesson.confidence || 0.5,
      importance: lesson.importance || 'medium',
      createdAt: new Date(),
      lastValidated: new Date(),
      userId: lesson.userId
    };
    
    this.lessons.set(fullLesson.id, fullLesson);
    eventBus.emit('market.lesson_learned', fullLesson);
  }
}

export const marketLearning = new MarketLearningSystem();