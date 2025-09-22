// Enhanced BID - Intelligent Business Intelligence Database with Learning and Adaptation

import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid as originalBid } from './bid';
import { bidCore } from './bidCore';
import { marketLearning } from './marketLearning';
import { userProgression } from './userProgression';
import { strategyLearning } from './strategyLearning';
import { bidValidator } from './bidValidator';
import { userBID } from './userBID';
import { BIDIntelligence, MarketLesson, UserLearningProfile } from '@/types/marketIntelligence';
import { generateULID } from '@/utils/ulid';

export class EnhancedBID {
  private intelligence: BIDIntelligence | null = null;
  private isInitialized = false;
  
  constructor() {
    this.initializeEventListeners();
    this.initializeIntelligence();
  }
  
  private initializeEventListeners(): void {
    // Listen to all system events for learning
    eventBus.on('trade.executed', (trade) => {
      this.processTradeForLearning(trade);
    });
    
    eventBus.on('trade.closed', (outcome) => {
      this.learnFromTradeOutcome(outcome);
    });
    
    eventBus.on('user.decision', (decision) => {
      this.analyzeUserDecision(decision);
    });
    
    eventBus.on('market.pattern_detected', (pattern) => {
      this.incorporateMarketPattern(pattern);
    });
    
    eventBus.on('oracle.signal.generated', (signal) => {
      this.processOracleSignal(signal);
    });
    
    // Listen to original BID events
    eventBus.on('bid.portfolio_updated', (portfolio) => {
      this.updateIntelligenceFromPortfolio(portfolio);
    });
    
    eventBus.on('bid.risk_metrics_updated', (riskMetrics) => {
      this.updateIntelligenceFromRisk(riskMetrics);
    });
  }
  
  private async initializeIntelligence(): Promise<void> {
    try {
      const currentRegime = marketLearning.getCurrentRegime();
      const detectedPatterns = marketLearning.getDetectedPatterns();
      const topStrategies = strategyLearning.getTopPerformingStrategies(3);
      
      this.intelligence = {
        marketUnderstanding: {
          currentRegime: currentRegime || {
            id: 'default',
            name: 'Market Learning Phase',
            type: 'sideways',
            startDate: new Date(),
            characteristics: {
              volatility: 0.15,
              correlation: 0.7,
              momentum: 0.0,
              meanReversion: 0.5
            },
            successfulStrategies: [],
            failedStrategies: [],
            keyIndicators: {},
            learningConfidence: 0.3
          },
          detectedPatterns: detectedPatterns,
          activeThemes: this.extractActiveThemes(),
          riskFactors: this.identifyRiskFactors(),
          opportunities: this.identifyOpportunities()
        },
        
        userGrowth: {
          currentLevel: 'beginner',
          progressToNext: 0,
          recentLearning: [],
          recommendedFocus: ['risk_management', 'position_sizing'],
          personalizedInsights: []
        },
        
        strategyIntelligence: {
          topPerforming: topStrategies,
          emerging: this.identifyEmergingStrategies(),
          declining: this.identifyDecliningStrategies(),
          recommendations: []
        },
        
        marketMemory: {
          criticalLessons: marketLearning.getCriticalLessons(),
          recentPatterns: detectedPatterns.slice(0, 5),
          seasonalEffects: this.analyzeSeasonalEffects(),
          correlationLearning: this.analyzeCorrelationLearning()
        }
      };
      
      this.isInitialized = true;
      eventBus.emit('bid.intelligence_initialized', this.intelligence);
      
      logService.log('info', 'Enhanced BID intelligence initialized');
      
    } catch (error) {
      logService.log('error', 'Failed to initialize BID intelligence', { error });
    }
  }
  
  // Core intelligence processing methods
  private processTradeForLearning(trade: any): void {
    if (!this.intelligence) return;
    
    // Analyze the trade in context of current market understanding
    const marketContext = {
      regime: this.intelligence.marketUnderstanding.currentRegime.type,
      patterns: this.intelligence.marketUnderstanding.detectedPatterns.length,
      riskLevel: this.assessCurrentRiskLevel(),
      volatility: this.intelligence.marketUnderstanding.currentRegime.characteristics.volatility
    };
    
    // Create learning event
    const learningEvent = {
      userId: trade.userId,
      tradeId: trade.id,
      symbol: trade.symbol,
      marketContext,
      preTradeIntelligence: { ...this.intelligence.marketUnderstanding },
      timestamp: new Date()
    };
    
    // Emit for other systems to learn from
    eventBus.emit('bid.trade_learning_event', learningEvent);
  }
  
  private learnFromTradeOutcome(outcome: any): void {
    if (!this.intelligence) return;
    
    // Extract lessons from the outcome
    const lessons = this.extractLessonsFromOutcome(outcome);
    
    // Update market memory with new lessons
    lessons.forEach(lesson => {
      this.intelligence!.marketMemory.criticalLessons.push(lesson);
    });
    
    // Keep only most important lessons (limit memory size)
    this.intelligence.marketMemory.criticalLessons = 
      this.intelligence.marketMemory.criticalLessons
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 100);
    
    // Update strategy intelligence
    this.updateStrategyIntelligence(outcome);
    
    // Generate new insights for user
    this.generatePersonalizedInsights(outcome.userId);
  }
  
  private analyzeUserDecision(decision: any): void {
    if (!this.intelligence) return;
    
    // Learn from user's decision-making pattern
    const decisionAnalysis = {
      quality: this.assessDecisionQuality(decision),
      alignment: this.assessMarketAlignment(decision),
      riskLevel: this.assessDecisionRisk(decision),
      learningOpportunity: this.identifyLearningOpportunity(decision)
    };
    
    // Update user growth intelligence
    this.updateUserGrowthIntelligence(decision.userId, decisionAnalysis);
  }
  
  private incorporateMarketPattern(patternData: any): void {
    if (!this.intelligence) return;
    
    const { pattern } = patternData;
    
    // Add to detected patterns if not already there
    const existingIndex = this.intelligence.marketUnderstanding.detectedPatterns
      .findIndex(p => p.id === pattern.id);
    
    if (existingIndex >= 0) {
      this.intelligence.marketUnderstanding.detectedPatterns[existingIndex] = pattern;
    } else {
      this.intelligence.marketUnderstanding.detectedPatterns.push(pattern);
    }
    
    // Update active themes based on new pattern
    this.updateActiveThemes(pattern);
    
    // Generate new opportunities and risk factors
    this.intelligence.marketUnderstanding.opportunities = this.identifyOpportunities();
    this.intelligence.marketUnderstanding.riskFactors = this.identifyRiskFactors();
  }
  
  private processOracleSignal(signal: any): void {
    if (!this.intelligence) return;
    
    // Analyze signal in context of current market understanding
    const signalIntelligence = this.analyzeSignalIntelligence(signal);
    
    // Update market understanding based on signal
    this.updateMarketUnderstanding(signal, signalIntelligence);
  }
  
  // Intelligence update methods
  private updateIntelligenceFromPortfolio(portfolio: any): void {
    if (!this.intelligence) return;
    
    // Update user growth based on portfolio performance
    const portfolioLessons = this.extractPortfolioLessons(portfolio);
    
    portfolioLessons.forEach(lesson => {
      if (!this.intelligence!.marketMemory.criticalLessons.some(l => l.id === lesson.id)) {
        this.intelligence!.marketMemory.criticalLessons.push(lesson);
      }
    });
  }
  
  private updateIntelligenceFromRisk(riskMetrics: any): void {
    if (!this.intelligence) return;
    
    // Update risk factors based on new metrics
    const newRiskFactors = this.analyzeRiskMetricsForFactors(riskMetrics);
    
    this.intelligence.marketUnderstanding.riskFactors = [
      ...this.intelligence.marketUnderstanding.riskFactors,
      ...newRiskFactors
    ].slice(0, 10); // Keep top 10 risk factors
  }
  
  // Analysis methods
  private extractLessonsFromOutcome(outcome: any): MarketLesson[] {
    const lessons: MarketLesson[] = [];
    
    // Learn from successful trades
    if (outcome.realized_pnl > 0) {
      if (outcome.strategy && outcome.market_condition) {
        lessons.push({
          id: generateULID(),
          type: 'strategy',
          lesson: `${outcome.strategy} strategy successful in ${outcome.market_condition} conditions`,
          evidence: {
            occurrences: 1,
            successRate: 1.0,
            avgOutcome: outcome.realized_pnl,
            timespan: 1
          },
          conditions: {
            strategy: outcome.strategy,
            marketCondition: outcome.market_condition,
            holdingPeriod: outcome.holding_period_hours
          },
          actionable: `Continue using ${outcome.strategy} in similar market conditions`,
          confidence: 0.6,
          importance: 'medium',
          createdAt: new Date(),
          lastValidated: new Date()
        });
      }
    }
    
    // Learn from losses
    if (outcome.realized_pnl < 0 && outcome.max_drawdown_pct > 0.05) {
      lessons.push({
        id: generateULID(),
        type: 'pattern',
        lesson: `High drawdown risk in ${outcome.market_condition} conditions`,
        evidence: {
          occurrences: 1,
          successRate: 0,
          avgOutcome: outcome.realized_pnl,
          timespan: 1
        },
        conditions: {
          marketCondition: outcome.market_condition,
          symbol: outcome.symbol
        },
        actionable: 'Use tighter stops in similar conditions',
        confidence: 0.4,
        importance: 'high',
        createdAt: new Date(),
        lastValidated: new Date()
      });
    }
    
    return lessons;
  }
  
  private updateStrategyIntelligence(outcome: any): void {
    if (!this.intelligence) return;
    
    // Get updated strategy rankings
    const topStrategies = strategyLearning.getTopPerformingStrategies(5);
    this.intelligence.strategyIntelligence.topPerforming = topStrategies;
    
    // Generate new recommendations
    const marketCondition = this.intelligence.marketUnderstanding.currentRegime.type;
    const recommendations = strategyLearning.getStrategyRecommendations(marketCondition);
    this.intelligence.strategyIntelligence.recommendations = recommendations;
  }
  
  private generatePersonalizedInsights(userId: string): void {
    if (!this.intelligence) return;
    
    const userProfile = userProgression.getUserProfile(userId);
    if (!userProfile) return;
    
    const insights: string[] = [];
    
    // Generate insights based on user level and recent performance
    if (userProfile.experienceLevel === 'beginner') {
      insights.push('Focus on risk management and position sizing for consistent growth');
      insights.push('Consider paper trading to practice before using real money');
    } else if (userProfile.experienceLevel === 'intermediate') {
      insights.push('Start incorporating technical analysis into your decision making');
      insights.push('Learn about market regimes and how they affect strategy performance');
    }
    
    // Generate insights based on current market conditions
    const regime = this.intelligence.marketUnderstanding.currentRegime;
    if (regime.type === 'volatile') {
      insights.push('Current volatile market conditions favor shorter holding periods');
      insights.push('Consider reducing position sizes during high volatility');
    }
    
    this.intelligence.userGrowth.personalizedInsights = insights;
  }
  
  // Helper analysis methods
  private extractActiveThemes(): string[] {
    // Would analyze current market patterns and news to extract themes
    return ['AI/ML Growth', 'Interest Rate Sensitivity', 'Sector Rotation'];
  }
  
  private identifyRiskFactors(): string[] {
    // Would analyze current conditions for risk factors
    return ['High Volatility', 'Low Volume', 'Correlation Breakdown'];
  }
  
  private identifyOpportunities(): string[] {
    // Would analyze patterns and conditions for opportunities
    return ['Oversold Bounce', 'Breakout Setups', 'Sector Momentum'];
  }
  
  private identifyEmergingStrategies(): string[] {
    return ['Volatility Trading', 'Sector Pairs'];
  }
  
  private identifyDecliningStrategies(): string[] {
    return ['Buy and Hold', 'Momentum Chasing'];
  }
  
  private analyzeSeasonalEffects(): Record<string, any> {
    return {
      january_effect: { strength: 0.3, confidence: 0.6 },
      summer_doldrums: { strength: 0.2, confidence: 0.4 }
    };
  }
  
  private analyzeCorrelationLearning(): Record<string, number> {
    return {
      'SPY-QQQ': 0.85,
      'VIX-SPY': -0.75,
      'DXY-Gold': -0.60
    };
  }
  
  private assessCurrentRiskLevel(): 'low' | 'medium' | 'high' {
    if (!this.intelligence) return 'medium';
    
    const volatility = this.intelligence.marketUnderstanding.currentRegime.characteristics.volatility;
    
    if (volatility > 0.25) return 'high';
    if (volatility < 0.10) return 'low';
    return 'medium';
  }
  
  private assessDecisionQuality(decision: any): 'poor' | 'fair' | 'good' | 'excellent' {
    // Analyze decision quality based on market conditions, timing, etc.
    return 'good'; // Simplified
  }
  
  private assessMarketAlignment(decision: any): number {
    // How well does the decision align with current market conditions
    return 0.7; // Simplified
  }
  
  private assessDecisionRisk(decision: any): number {
    // Assess the risk level of the decision
    return 0.5; // Simplified
  }
  
  private identifyLearningOpportunity(decision: any): string | null {
    // Identify what the user could learn from this decision
    return 'Consider market regime analysis before entry'; // Simplified
  }
  
  private updateUserGrowthIntelligence(userId: string, analysis: any): void {
    // Update user growth based on decision analysis
    // This would interact with userProgression service
  }
  
  private updateActiveThemes(pattern: any): void {
    if (!this.intelligence) return;
    
    // Update themes based on new pattern
    if (pattern.type === 'breakout' && pattern.confidence > 0.7) {
      if (!this.intelligence.marketUnderstanding.activeThemes.includes('Breakout Momentum')) {
        this.intelligence.marketUnderstanding.activeThemes.push('Breakout Momentum');
      }
    }
  }
  
  private analyzeSignalIntelligence(signal: any): any {
    // Analyze Oracle signal in context of market intelligence
    return {
      alignment: 0.8, // How well it aligns with current understanding
      novelty: 0.3,   // How new/different this signal is
      confidence: signal.confidence || 0.5
    };
  }
  
  private updateMarketUnderstanding(signal: any, signalIntelligence: any): void {
    // Update market understanding based on Oracle signal
    if (!this.intelligence) return;
    
    if (signalIntelligence.novelty > 0.7) {
      // This is a novel signal - might indicate regime change
      this.intelligence.marketUnderstanding.currentRegime.learningConfidence *= 0.9;
    }
  }
  
  private extractPortfolioLessons(portfolio: any): MarketLesson[] {
    const lessons: MarketLesson[] = [];
    
    // Extract lessons from portfolio performance
    if (portfolio.totalUnrealizedPnLPercent > 10) {
      lessons.push({
        id: generateULID(),
        type: 'pattern',
        lesson: 'Strong portfolio performance indicates good market timing',
        evidence: {
          occurrences: 1,
          successRate: 1.0,
          avgOutcome: portfolio.totalUnrealizedPnL,
          timespan: 1
        },
        conditions: {},
        actionable: 'Continue current strategy mix',
        confidence: 0.6,
        importance: 'medium',
        createdAt: new Date(),
        lastValidated: new Date()
      });
    }
    
    return lessons;
  }
  
  private analyzeRiskMetricsForFactors(riskMetrics: any): string[] {
    const factors: string[] = [];
    
    if (riskMetrics.concentrationRisk > 0.4) {
      factors.push('High Concentration Risk');
    }
    
    if (riskMetrics.volatility > 0.3) {
      factors.push('Portfolio Volatility');
    }
    
    return factors;
  }
  
  // Public API methods
  public async initializeForUser(userId: string): Promise<void> {
    // Initialize user-specific intelligence
    await userProgression.initializeUserProfile(userId);
    
    // Update user growth intelligence
    const userProfile = userProgression.getUserProfile(userId);
    if (userProfile && this.intelligence) {
      this.intelligence.userGrowth = {
        currentLevel: userProfile.experienceLevel,
        progressToNext: this.calculateProgressToNext(userProfile),
        recentLearning: this.getRecentUserLearning(userId),
        recommendedFocus: userProfile.adaptiveRecommendations.currentFocus,
        personalizedInsights: this.generateUserInsights(userProfile)
      };
    }
  }
  
  public getIntelligence(): BIDIntelligence | null {
    return this.intelligence;
  }
  
  public getMarketUnderstanding(): BIDIntelligence['marketUnderstanding'] | null {
    return this.intelligence?.marketUnderstanding || null;
  }
  
  public getUserGrowthIntelligence(userId: string): BIDIntelligence['userGrowth'] | null {
    return this.intelligence?.userGrowth || null;
  }
  
  public getStrategyIntelligence(): BIDIntelligence['strategyIntelligence'] | null {
    return this.intelligence?.strategyIntelligence || null;
  }
  
  public getMarketMemory(): BIDIntelligence['marketMemory'] | null {
    return this.intelligence?.marketMemory || null;
  }
  
  public async validateTrade(context: any): Promise<any> {
    // Use enhanced validator with learning
    return await bidValidator.validateTrade(context);
  }
  
  public learnFromManualInput(userId: string, lesson: string, type: string = 'user_feedback'): void {
    // Allow manual input of lessons
    marketLearning.learnFromManualInput({
      type: type as any,
      lesson,
      userId,
      confidence: 0.5,
      importance: 'medium'
    });
  }
  
  public getPersonalizedRecommendations(userId: string): any {
    const userProfile = userProgression.getUserProfile(userId);
    if (!userProfile || !this.intelligence) return null;
    
    return {
      strategies: this.intelligence.strategyIntelligence.recommendations,
      learningFocus: userProfile.adaptiveRecommendations.currentFocus,
      riskAdjustments: userProfile.adaptiveRecommendations.riskAdjustments,
      marketInsights: this.intelligence.userGrowth.personalizedInsights
    };
  }
  
  // Helper methods for user intelligence
  private calculateProgressToNext(userProfile: UserLearningProfile): number {
    // Calculate progress to next level based on milestones
    const currentLevel = userProfile.experienceLevel;
    const milestones = userProfile.learningMilestones.length;
    
    switch (currentLevel) {
      case 'beginner':
        return Math.min(100, milestones * 10); // Need ~10 milestones
      case 'intermediate':
        return Math.min(100, (milestones - 10) * 5); // Need ~20 total
      case 'advanced':
        return Math.min(100, (milestones - 20) * 2.5); // Need ~40 total
      default:
        return 100;
    }
  }
  
  private getRecentUserLearning(userId: string): MarketLesson[] {
    return marketLearning.getMarketLessons(userId).slice(0, 5);
  }
  
  private generateUserInsights(userProfile: UserLearningProfile): string[] {
    const insights: string[] = [];
    
    // Generate insights based on user's weak and strong areas
    if (userProfile.weakAreas.includes('risk_management')) {
      insights.push('Focus on position sizing and stop-loss discipline');
    }
    
    if (userProfile.strongAreas.includes('technical_analysis')) {
      insights.push('Leverage your technical analysis skills with systematic approaches');
    }
    
    return insights;
  }
  
  // Maintain compatibility with original BID
  public getPortfolio() {
    return originalBid.getPortfolio();
  }
  
  public getRiskMetrics() {
    return originalBid.getRiskMetrics();
  }
  
  public getAlerts(unacknowledgedOnly = false) {
    return originalBid.getAlerts(unacknowledgedOnly);
  }
  
  public getOracleSignals(limit = 20) {
    return originalBid.getOracleSignals(limit);
  }
}

// Export enhanced BID instance
export const enhancedBID = new EnhancedBID();
