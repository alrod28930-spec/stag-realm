// The Learning Bot - Continuous System Optimizer
// Self-improvement engine that reviews all modules and optimizes performance

import { eventBus } from './eventBus';
import { recorder } from './recorder';
import { bid } from './bid';
import { tradeBotSystem } from './tradeBots';
import { oracle } from './oracle';
import { logService } from './logging';
import { generateULID } from '@/utils/ulid';
import { TradeBot, BotConfig } from '@/types/tradeBots';

interface LearningUpdate {
  id: string;
  type: 'parameter_adjustment' | 'threshold_update' | 'signal_suppression' | 'strategy_optimization' | 'explanation_improvement';
  module: 'trade_bots' | 'oracle' | 'analyst' | 'risk_settings' | 'bid';
  targetId?: string; // Bot ID, signal type, etc.
  changes: Record<string, any>;
  reasoning: string[];
  confidence: number;
  expectedImprovement: number;
  approvalRequired: boolean;
  approved: boolean;
  appliedAt?: Date;
  rollbackData?: any;
  timestamp: Date;
}

interface PerformancePattern {
  module: string;
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number;
  significance: number;
  recommendations: string[];
}

interface LearningMetrics {
  totalOptimizations: number;
  appliedOptimizations: number;
  pendingApprovals: number;
  averageImprovement: number;
  successRate: number;
  lastAnalysis: Date;
  activeLearning: boolean;
}

interface LearningSettings {
  enabled: boolean;
  autoApplyLowRisk: boolean;
  requireApprovalThreshold: number;
  analysisFrequency: 'hourly' | 'daily' | 'weekly';
  maxParameterChange: number;
  conservativeMode: boolean;
}

class LearningBotService {
  private updates: Map<string, LearningUpdate> = new Map();
  private patterns: Map<string, PerformancePattern> = new Map();
  private settings: LearningSettings;
  private isActive = true;
  private analysisInterval?: NodeJS.Timeout;
  private lastAnalysis = new Date();
  private learningCycles = 0;
  private readonly MAX_UPDATES_STORED = 200;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initialize();
  }

  private getDefaultSettings(): LearningSettings {
    return {
      enabled: true,
      autoApplyLowRisk: true,
      requireApprovalThreshold: 0.3, // Changes with >30% impact need approval
      analysisFrequency: 'daily',
      maxParameterChange: 0.2, // Max 20% parameter change per update
      conservativeMode: true
    };
  }

  private initialize(): void {
    logService.log('info', 'Learning Bot: Initializing continuous optimizer');

    // Listen for trade outcomes to learn from results
    eventBus.on('trade.executed', (trade: any) => {
      this.analyzeTradeOutcome(trade).catch(error => {
        logService.log('error', 'Learning Bot trade analysis failed', { error });
      });
    });

    // Listen for user interactions with Analyst
    eventBus.on('analyst.explanation_requested', (data: any) => {
      this.trackAnalystEngagement(data).catch(error => {
        logService.log('error', 'Learning Bot analyst tracking failed', { error });
      });
    });

    // Listen for Oracle signal effectiveness
    eventBus.on('oracle.signal_outcome', (outcome: any) => {
      this.evaluateSignalEffectiveness(outcome).catch(error => {
        logService.log('error', 'Learning Bot signal evaluation failed', { error });
      });
    });

    // Listen for Seeker findings to optimize intelligence gathering
    eventBus.on('seeker.finding', (finding: any) => {
      this.optimizeFindingProcessing(finding).catch(error => {
        logService.log('error', 'Learning Bot finding optimization failed', { error });
      });
    });

    // Start learning cycles based on frequency
    this.startLearningCycles();

    logService.log('info', 'Learning Bot: Active - monitoring system performance');
  }

  private startLearningCycles(): void {
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };

    const interval = intervals[this.settings.analysisFrequency];
    
    this.analysisInterval = setInterval(() => {
      this.performLearningCycle().catch(error => {
        logService.log('error', 'Learning Bot cycle failed', { error });
      });
    }, interval);

    // Also run mini-cycles every 10 minutes for real-time adjustments
    setInterval(() => {
      this.performMiniCycle().catch(error => {
        logService.log('error', 'Learning Bot mini-cycle failed', { error });
      });
    }, 10 * 60 * 1000);
  }

  private async performLearningCycle(): Promise<void> {
    if (!this.isActive || !this.settings.enabled) return;

    this.learningCycles++;
    const cycleStart = Date.now();

    try {
      logService.log('info', `Learning Bot: Starting cycle ${this.learningCycles}`);

      // 1. Analyze Trade Bot performance
      await this.analyzeTradeBotPerformance();

      // 2. Evaluate Oracle signal quality
      await this.evaluateOracleSignalQuality();

      // 3. Optimize Analyst explanations
      await this.optimizeAnalystExplanations();

      // 4. Review risk parameter effectiveness
      await this.reviewRiskParameters();

      // 5. Process pending approvals
      await this.processPendingApprovals();

      // 6. Apply approved optimizations
      await this.applyApprovedOptimizations();

      // 7. Cleanup old data
      this.cleanupOldUpdates();

      this.lastAnalysis = new Date();
      
      const cycleDuration = Date.now() - cycleStart;
      logService.log('info', `Learning Bot: Cycle ${this.learningCycles} completed in ${cycleDuration}ms`);

    } catch (error) {
      logService.log('error', 'Learning Bot cycle error', { 
        error,
        cycle: this.learningCycles
      });
    }
  }

  private async performMiniCycle(): Promise<void> {
    if (!this.isActive || !this.settings.enabled) return;

    try {
      // Quick real-time adjustments
      await this.adjustRealTimeParameters();
      await this.suppressNoisySignals();
      
    } catch (error) {
      logService.log('error', 'Learning Bot mini-cycle error', { error });
    }
  }

  private async analyzeTradeBotPerformance(): Promise<void> {
    try {
      const bots = tradeBotSystem.getBots();
      
      for (const bot of bots) {
        const journalEntries = tradeBotSystem.getJournalEntries(bot.id);
        
        if (journalEntries.length >= 10) {
          // Analyze success patterns
          const successRate = this.calculateBotSuccessRate(bot.id);
          const confidenceAccuracy = this.analyzeConfidenceAccuracy(journalEntries);
          
          // Generate optimization recommendations
          if (successRate < 0.5) {
            await this.generateBotOptimization(bot, {
              successRate,
              confidenceAccuracy,
              issue: 'low_success_rate'
            });
          }

          if (confidenceAccuracy < 0.6) {
            await this.generateBotOptimization(bot, {
              successRate,
              confidenceAccuracy,
              issue: 'confidence_calibration'
            });
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot trade bot analysis failed', { error });
    }
  }

  private calculateBotSuccessRate(botId: string): number {
    // Mock calculation - would use actual trade outcome data
    return 0.3 + Math.random() * 0.5; // 30-80% success rate
  }

  private analyzeConfidenceAccuracy(entries: any[]): number {
    // Mock analysis of confidence vs actual outcomes
    return 0.4 + Math.random() * 0.5; // 40-90% accuracy
  }

  private async generateBotOptimization(bot: TradeBot, analysis: any): Promise<void> {
    try {
      let changes: Record<string, any> = {};
      let reasoning: string[] = [];
      let expectedImprovement = 0;

      if (analysis.issue === 'low_success_rate') {
        // Adjust thresholds to be more conservative
        changes = {
          minConfidenceThreshold: Math.min(bot.config.minConfidenceThreshold + 0.1, 0.9),
          stopLossPercent: Math.max(bot.config.stopLossPercent * 0.9, 2),
          maxPositionSize: Math.max(bot.config.maxPositionSize * 0.8, 100)
        };
        reasoning = [
          'Low success rate detected - increasing confidence threshold',
          'Tightening stop loss to reduce losses',
          'Reducing position size for better risk management'
        ];
        expectedImprovement = 0.15;
      } else if (analysis.issue === 'confidence_calibration') {
        // Adjust confidence calculation parameters
        changes = {
          minConfidenceThreshold: bot.config.minConfidenceThreshold + 0.05,
          strategyParams: {
            ...bot.config.strategyParams,
            confidenceAdjustment: -0.1 // Make confidence more conservative
          }
        };
        reasoning = [
          'Confidence calibration issue detected',
          'Adjusting confidence thresholds for better accuracy',
          'Implementing conservative confidence adjustment'
        ];
        expectedImprovement = 0.1;
      }

        const update: LearningUpdate = {
          id: generateULID('evt_'),
        type: 'strategy_optimization',
        module: 'trade_bots',
        targetId: bot.id,
        changes,
        reasoning,
        confidence: 0.7,
        expectedImprovement,
        approvalRequired: expectedImprovement > this.settings.requireApprovalThreshold,
        approved: false,
        timestamp: new Date()
      };

      await this.recordLearningUpdate(update);

    } catch (error) {
      logService.log('error', 'Learning Bot bot optimization failed', { error, bot });
    }
  }

  private async evaluateOracleSignalQuality(): Promise<void> {
    try {
      const recentSignals = oracle.getSignals(100);
      const signalTypes = new Map<string, any[]>();
      
      // Group by signal type
      recentSignals.forEach(signal => {
        const existing = signalTypes.get(signal.type) || [];
        existing.push(signal);
        signalTypes.set(signal.type, existing);
      });

      // Analyze each signal type
      for (const [type, signals] of signalTypes) {
        const effectivenessScore = this.calculateSignalEffectiveness(signals);
        
        if (effectivenessScore < 0.4) {
          // Suppress noisy signal type
          const update: LearningUpdate = {
            id: generateULID('learn_'),
            type: 'signal_suppression',
            module: 'oracle',
            targetId: type,
            changes: {
              suppressionLevel: 0.7,
              requiredConfidence: 0.8,
              reason: 'low_effectiveness'
            },
            reasoning: [
              `Signal type '${type}' showing low effectiveness: ${(effectivenessScore * 100).toFixed(1)}%`,
              'Increasing confidence requirements for this signal type',
              'Temporary suppression until effectiveness improves'
            ],
            confidence: 1.0 - effectivenessScore,
            expectedImprovement: 0.2,
            approvalRequired: false, // Low-risk change
            approved: true,
            timestamp: new Date()
          };

          await this.recordLearningUpdate(update);
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot Oracle signal evaluation failed', { error });
    }
  }

  private calculateSignalEffectiveness(signals: any[]): number {
    // Mock calculation - would analyze actual signal vs outcome correlation
    return Math.random() * 0.8 + 0.1; // 10-90% effectiveness
  }

  private async optimizeAnalystExplanations(): Promise<void> {
    try {
      // Mock analysis of user engagement with Analyst explanations
      const engagementData = {
        averageListenTime: 45 + Math.random() * 60, // 45-105 seconds
        replayRate: Math.random() * 0.3, // 0-30% replay rate
        positiveResponses: Math.random() * 0.8 + 0.1 // 10-90% positive
      };

      if (engagementData.averageListenTime < 30 || engagementData.replayRate < 0.1) {
        const update: LearningUpdate = {
          id: generateULID('learn_'),
          type: 'explanation_improvement',
          module: 'analyst',
          changes: {
            explanationLength: 'shorter',
            technicalDetail: 'reduced',
            focusAreas: ['key_points', 'actionable_insights'],
            avgTargetLength: 30
          },
          reasoning: [
            'Low engagement with current explanation format',
            `Average listen time: ${engagementData.averageListenTime.toFixed(1)}s`,
            'Optimizing for shorter, more focused explanations'
          ],
          confidence: 0.8,
          expectedImprovement: 0.25,
          approvalRequired: false,
          approved: true,
          timestamp: new Date()
        };

        await this.recordLearningUpdate(update);
      }
    } catch (error) {
      logService.log('error', 'Learning Bot Analyst optimization failed', { error });
    }
  }

  private async reviewRiskParameters(): Promise<void> {
    try {
      // Analyze effectiveness of current risk parameters
      const portfolioMetrics = bid.getRiskMetrics();
      
      if (portfolioMetrics) {
        // Check if risk parameters are too conservative or too aggressive
        const drawdownHistory = [portfolioMetrics.maxDrawdown]; // Mock historical data
        const avgDrawdown = drawdownHistory.reduce((sum, d) => sum + d, 0) / drawdownHistory.length;
        
        if (avgDrawdown < 0.02) {
          // Risk parameters might be too conservative
          const update: LearningUpdate = {
            id: generateULID('learn_'),
            type: 'parameter_adjustment',
            module: 'risk_settings',
            changes: {
              maxPositionPercent: 17, // Increase from 15% to 17%
              maxDailyDrawdown: 6, // Increase from 5% to 6%
              reasoning: 'Conservative adjustment based on low historical drawdown'
            },
            reasoning: [
              'Risk parameters appear too conservative',
              `Average drawdown: ${(avgDrawdown * 100).toFixed(1)}% (target: 2-4%)`,
              'Suggesting modest increase in risk tolerance'
            ],
            confidence: 0.6,
            expectedImprovement: 0.1,
            approvalRequired: true, // Risk parameter changes need approval
            approved: false,
            timestamp: new Date()
          };

          await this.recordLearningUpdate(update);
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot risk parameter review failed', { error });
    }
  }

  private async adjustRealTimeParameters(): Promise<void> {
    try {
      // Real-time micro-adjustments based on current market conditions
      const currentVolatility = Math.random() * 0.4; // Mock volatility 0-40%
      
      if (currentVolatility > 0.3) {
        // High volatility - tighten parameters temporarily
        const bots = tradeBotSystem.getBots().filter(bot => bot.status === 'live');
        
        for (const bot of bots) {
          const update: LearningUpdate = {
            id: generateULID('learn_'),
            type: 'parameter_adjustment',
            module: 'trade_bots',
            targetId: bot.id,
            changes: {
              tempStopLossAdjustment: -0.5, // Tighten stop loss by 0.5%
              tempConfidenceBoost: 0.05, // Require 5% higher confidence
              tempPositionReduction: 0.1, // Reduce position size by 10%
              expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
            },
            reasoning: [
              `High market volatility detected: ${(currentVolatility * 100).toFixed(1)}%`,
              'Temporarily tightening risk parameters',
              'Adjustment will auto-expire in 4 hours'
            ],
            confidence: 0.9,
            expectedImprovement: 0.05,
            approvalRequired: false, // Temporary micro-adjustments
            approved: true,
            timestamp: new Date()
          };

          await this.recordLearningUpdate(update);
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot real-time adjustment failed', { error });
    }
  }

  private async suppressNoisySignals(): Promise<void> {
    try {
      const recentSignals = oracle.getSignals(50);
      const now = Date.now();
      const lastHour = now - (60 * 60 * 1000);
      
      // Count signal frequency by type
      const signalCounts = new Map<string, number>();
      recentSignals.forEach(signal => {
        if (signal.timestamp.getTime() > lastHour) {
          const count = signalCounts.get(signal.type) || 0;
          signalCounts.set(signal.type, count + 1);
        }
      });

      // Suppress overly frequent signals
      for (const [type, count] of signalCounts) {
        if (count > 10) { // More than 10 signals per hour
          const update: LearningUpdate = {
            id: generateULID('learn_'),
            type: 'signal_suppression',
            module: 'oracle',
            targetId: type,
            changes: {
              tempSuppression: true,
              suppressionDuration: 2 * 60 * 60 * 1000, // 2 hours
              reason: 'excessive_frequency'
            },
            reasoning: [
              `Signal type '${type}' showing excessive frequency: ${count} signals/hour`,
              'Temporarily suppressing to reduce noise',
              'Will auto-restore in 2 hours'
            ],
            confidence: 0.9,
            expectedImprovement: 0.1,
            approvalRequired: false,
            approved: true,
            timestamp: new Date()
          };

          await this.recordLearningUpdate(update);
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot signal suppression failed', { error });
    }
  }

  private async analyzeTradeOutcome(trade: any): Promise<void> {
    try {
      // Learn from individual trade outcomes
      if (trade.botId && trade.outcome) {
        const bot = tradeBotSystem.getBot(trade.botId);
        const journalEntry = tradeBotSystem.getJournalEntries(trade.botId)
          .find(e => e.symbol === trade.symbol);

        if (bot && journalEntry) {
          const success = trade.outcome === 'profit';
          const confidence = journalEntry.confidenceScore;
          
          // Update bot's learning parameters based on outcome
          const learningRate = 0.05; // 5% adjustment rate
          let adjustment = success ? learningRate : -learningRate;
          
          // Confidence-based learning
          if (confidence > 0.8 && !success) {
            // High confidence failure - significant learning opportunity
            adjustment = -learningRate * 2;
          } else if (confidence < 0.6 && success) {
            // Low confidence success - may have been too conservative
            adjustment = learningRate * 1.5;
          }

          if (Math.abs(adjustment) > 0.02) { // Only apply significant adjustments
            const update: LearningUpdate = {
              id: generateULID('learn_'),
              type: 'parameter_adjustment',
              module: 'trade_bots',
              targetId: bot.id,
              changes: {
                strategyParams: {
                  ...bot.config.strategyParams,
                  learningAdjustment: adjustment,
                  lastTradeOutcome: trade.outcome,
                  confidenceCalibration: confidence - (success ? 0 : 1)
                }
              },
              reasoning: [
                `Learning from trade outcome: ${trade.outcome}`,
                `Confidence was ${(confidence * 100).toFixed(1)}%, outcome was ${success ? 'success' : 'failure'}`,
                `Applying ${adjustment > 0 ? 'positive' : 'negative'} adjustment of ${Math.abs(adjustment * 100).toFixed(1)}%`
              ],
              confidence: Math.abs(adjustment) * 10, // Higher confidence for larger adjustments
              expectedImprovement: Math.abs(adjustment),
              approvalRequired: Math.abs(adjustment) > 0.1,
              approved: Math.abs(adjustment) <= 0.1,
              timestamp: new Date()
            };

            await this.recordLearningUpdate(update);
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot trade outcome analysis failed', { error });
    }
  }

  private async trackAnalystEngagement(data: any): Promise<void> {
    try {
      // Track how users interact with Analyst explanations
      const engagement = {
        requestType: data.type,
        duration: data.duration || 0,
        userRating: data.rating || null,
        replay: data.replay || false,
        timestamp: new Date()
      };

      // Store engagement data for analysis
      // This would typically go to a dedicated analytics store
      logService.log('debug', 'Learning Bot tracking Analyst engagement', engagement);

      // If engagement is consistently low, suggest improvements
      if (engagement.duration < 15 && !engagement.replay) {
        const update: LearningUpdate = {
          id: generateULID('learn_'),
          type: 'explanation_improvement',
          module: 'analyst',
          changes: {
            shortFormMode: true,
            bulletPoints: true,
            maxLength: 20,
            focusOnAction: true
          },
          reasoning: [
            'Low engagement detected with current explanation format',
            'User appears to prefer shorter, more actionable content',
            'Switching to bullet-point format with key actions'
          ],
          confidence: 0.7,
          expectedImprovement: 0.2,
          approvalRequired: false,
          approved: true,
          timestamp: new Date()
        };

        await this.recordLearningUpdate(update);
      }
    } catch (error) {
      logService.log('error', 'Learning Bot Analyst engagement tracking failed', { error });
    }
  }

  private async evaluateSignalEffectiveness(outcome: any): Promise<void> {
    try {
      // Evaluate how effective Oracle signals were for actual outcomes
      if (outcome.signal && outcome.actualResult) {
        const effectiveness = this.calculateOutcomeCorrelation(outcome.signal, outcome.actualResult);
        
        if (effectiveness < 0.3) {
          // Signal type is not effective
          const update: LearningUpdate = {
            id: generateULID('learn_'),
            type: 'signal_suppression',
            module: 'oracle',
            targetId: outcome.signal.type,
            changes: {
              effectivenessScore: effectiveness,
              suppressionRecommendation: true,
              alternativeSignals: this.suggestAlternatives(outcome.signal.type)
            },
            reasoning: [
              `Signal type '${outcome.signal.type}' showing low effectiveness`,
              `Correlation with actual outcomes: ${(effectiveness * 100).toFixed(1)}%`,
              'Recommending suppression or parameter adjustment'
            ],
            confidence: 1.0 - effectiveness,
            expectedImprovement: 0.15,
            approvalRequired: true,
            approved: false,
            timestamp: new Date()
          };

          await this.recordLearningUpdate(update);
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot signal effectiveness evaluation failed', { error });
    }
  }

  private calculateOutcomeCorrelation(signal: any, outcome: any): number {
    // Mock correlation calculation
    return Math.random() * 0.8 + 0.1; // 10-90% correlation
  }

  private suggestAlternatives(signalType: string): string[] {
    const alternatives = {
      'momentum': ['volume', 'technical'],
      'volume': ['momentum', 'sentiment'],
      'technical': ['fundamental', 'momentum'],
      'sentiment': ['volume', 'technical']
    };
    return alternatives[signalType as keyof typeof alternatives] || ['technical', 'volume'];
  }

  private async optimizeFindingProcessing(finding: any): Promise<void> {
    try {
      // Optimize how Seeker findings are processed
      if (finding.confidence > 0.8 && finding.type === 'niche_ticker') {
        const update: LearningUpdate = {
          id: generateULID('learn_'),
          type: 'parameter_adjustment',
          module: 'bid',
          changes: {
            seekerFindingWeight: 1.2, // Increase weight for high-confidence niche tickers
            processingPriority: 'high',
            integrationSpeed: 'fast'
          },
          reasoning: [
            'High-confidence Seeker finding detected',
            `Niche ticker with ${(finding.confidence * 100).toFixed(1)}% confidence`,
            'Increasing processing priority for similar findings'
          ],
          confidence: finding.confidence,
          expectedImprovement: 0.1,
          approvalRequired: false,
          approved: true,
          timestamp: new Date()
        };

        await this.recordLearningUpdate(update);
      }
    } catch (error) {
      logService.log('error', 'Learning Bot finding optimization failed', { error });
    }
  }

  private async recordLearningUpdate(update: LearningUpdate): Promise<void> {
    try {
      this.updates.set(update.id, update);

      // Use recorder createEntry method
      console.log('Learning Bot recorded update', {
        updateId: update.id,
        type: update.type,
        module: update.module
      });

      // Emit event for governance review if approval required
      if (update.approvalRequired) {
        eventBus.emit('governance.learning_approval_required', update);
      }

      // Auto-apply if pre-approved and low risk
      if (update.approved && !update.approvalRequired && this.settings.autoApplyLowRisk) {
        await this.applyUpdate(update);
      }

      logService.log('info', `Learning Bot recorded ${update.type} update`, {
        updateId: update.id,
        module: update.module,
        target: update.targetId,
        approvalRequired: update.approvalRequired
      });

    } catch (error) {
      logService.log('error', 'Learning Bot update recording failed', { error, update });
    }
  }

  private async processPendingApprovals(): Promise<void> {
    try {
      const pendingUpdates = Array.from(this.updates.values())
        .filter(u => u.approvalRequired && !u.approved);

      logService.log('info', `Learning Bot: Processing ${pendingUpdates.length} pending approvals`);

      // Auto-approve low-risk updates in conservative mode
      if (this.settings.conservativeMode) {
        for (const update of pendingUpdates) {
          if (update.expectedImprovement < 0.1 && update.confidence > 0.8) {
            update.approved = true;
            logService.log('info', `Learning Bot: Auto-approved low-risk update ${update.id}`);
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Learning Bot approval processing failed', { error });
    }
  }

  private async applyApprovedOptimizations(): Promise<void> {
    try {
      const toApply = Array.from(this.updates.values())
        .filter(u => u.approved && !u.appliedAt)
        .sort((a, b) => b.confidence - a.confidence);

      for (const update of toApply.slice(0, 5)) { // Apply top 5 updates per cycle
        await this.applyUpdate(update);
      }
    } catch (error) {
      logService.log('error', 'Learning Bot optimization application failed', { error });
    }
  }

  private async applyUpdate(update: LearningUpdate): Promise<void> {
    try {
      let applied = false;

      switch (update.module) {
        case 'trade_bots':
          if (update.targetId) {
            applied = tradeBotSystem.updateBotConfig(update.targetId, update.changes);
          }
          break;
          
        case 'oracle':
          // Would apply Oracle optimizations
          applied = true; // Mock application
          break;
          
        case 'analyst':
          // Would apply Analyst optimizations
          applied = true; // Mock application
          break;
          
        case 'risk_settings':
          // Would apply risk parameter updates
          applied = true; // Mock application
          break;
          
        case 'bid':
          // Would apply BID optimizations
          applied = true; // Mock application
          break;
      }

      if (applied) {
        update.appliedAt = new Date();
        
        // Log application
        console.log('Learning Bot applied update', {
          updateId: update.id,
          type: update.type,
          changes: update.changes
        });

        logService.log('info', `Learning Bot applied update ${update.id}`, {
          type: update.type,
          module: update.module,
          target: update.targetId
        });
      }
    } catch (error) {
      logService.log('error', 'Learning Bot update application failed', { error, update });
    }
  }

  private cleanupOldUpdates(): void {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      let deletedCount = 0;
      
      for (const [id, update] of this.updates) {
        if (update.timestamp.getTime() < cutoffTime || 
            this.updates.size > this.MAX_UPDATES_STORED) {
          this.updates.delete(id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logService.log('debug', `Learning Bot cleaned up ${deletedCount} old updates`);
      }
    } catch (error) {
      logService.log('error', 'Learning Bot cleanup failed', { error });
    }
  }

  // Public API
  public getMetrics(): LearningMetrics {
    const updates = Array.from(this.updates.values());
    const applied = updates.filter(u => u.appliedAt);
    const pending = updates.filter(u => u.approvalRequired && !u.approved);
    
    return {
      totalOptimizations: updates.length,
      appliedOptimizations: applied.length,
      pendingApprovals: pending.length,
      averageImprovement: applied.length > 0 
        ? applied.reduce((sum, u) => sum + u.expectedImprovement, 0) / applied.length 
        : 0,
      successRate: applied.length / Math.max(updates.length, 1),
      lastAnalysis: this.lastAnalysis,
      activeLearning: this.isActive && this.settings.enabled
    };
  }

  public getRecentUpdates(limit: number = 20): LearningUpdate[] {
    return Array.from(this.updates.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getPendingApprovals(): LearningUpdate[] {
    return Array.from(this.updates.values())
      .filter(u => u.approvalRequired && !u.approved)
      .sort((a, b) => b.expectedImprovement - a.expectedImprovement);
  }

  public approveUpdate(updateId: string): boolean {
    const update = this.updates.get(updateId);
    if (update && update.approvalRequired && !update.approved) {
      update.approved = true;
      logService.log('info', `Learning Bot update ${updateId} manually approved`);
      return true;
    }
    return false;
  }

  public rejectUpdate(updateId: string, reason?: string): boolean {
    const update = this.updates.get(updateId);
    if (update && update.approvalRequired && !update.approved) {
      this.updates.delete(updateId);
      logService.log('info', `Learning Bot update ${updateId} rejected`, { reason });
      return true;
    }
    return false;
  }

  public updateSettings(newSettings: Partial<LearningSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Restart learning cycles if frequency changed
    if (newSettings.analysisFrequency && this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.startLearningCycles();
    }

    logService.log('info', 'Learning Bot settings updated', newSettings);
  }

  public getSettings(): LearningSettings {
    return { ...this.settings };
  }

  public activate(): void {
    this.isActive = true;
    if (!this.analysisInterval) {
      this.startLearningCycles();
    }
    logService.log('info', 'Learning Bot: Activated');
  }

  public deactivate(): void {
    this.isActive = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }
    logService.log('info', 'Learning Bot: Deactivated');
  }

  public isActiveStatus(): boolean {
    return this.isActive && this.settings.enabled;
  }
}

// Export singleton instance
export const learningBot = new LearningBotService();