// User Progression System - Tracks user growth and adapts system to user level

import { logService } from './logging';
import { eventBus } from './eventBus';
import { UserLearningProfile } from '@/types/marketIntelligence';
import { supabase } from '@/integrations/supabase/client';

export class UserProgressionSystem {
  private userProfiles: Map<string, UserLearningProfile> = new Map();
  
  // Learning milestones and their requirements
  private readonly MILESTONES = {
    beginner_to_intermediate: {
      trades_completed: 10,
      win_rate_threshold: 0.4,
      concepts_learned: ['risk_management', 'position_sizing'],
      days_active: 14
    },
    intermediate_to_advanced: {
      trades_completed: 50,
      win_rate_threshold: 0.55,
      concepts_learned: ['technical_analysis', 'portfolio_theory', 'market_regimes'],
      days_active: 60
    },
    advanced_to_expert: {
      trades_completed: 200,
      win_rate_threshold: 0.65,
      concepts_learned: ['options_strategies', 'macro_analysis', 'risk_modeling'],
      days_active: 180
    }
  };
  
  // Skill areas and their components
  private readonly SKILL_AREAS = {
    risk_management: {
      components: ['position_sizing', 'stop_losses', 'diversification', 'correlation_analysis'],
      weight: 1.0
    },
    technical_analysis: {
      components: ['chart_patterns', 'indicators', 'support_resistance', 'volume_analysis'],
      weight: 0.8
    },
    fundamental_analysis: {
      components: ['financial_statements', 'valuation', 'sector_analysis', 'macro_factors'],
      weight: 0.7
    },
    portfolio_theory: {
      components: ['asset_allocation', 'rebalancing', 'correlation', 'optimization'],
      weight: 0.9
    },
    behavioral_finance: {
      components: ['bias_recognition', 'emotional_control', 'decision_making', 'discipline'],
      weight: 1.0
    }
  };
  
  constructor() {
    this.initializeEventListeners();
  }
  
  private initializeEventListeners(): void {
    // Track user actions for learning
    eventBus.on('trade.executed', (trade) => {
      this.recordTradeAction(trade.userId, trade);
    });
    
    eventBus.on('trade.closed', (outcome) => {
      this.analyzeTradeOutcome(outcome.userId, outcome);
    });
    
    eventBus.on('user.concept_learned', (data) => {
      this.recordConceptLearning(data.userId, data.concept);
    });
    
    eventBus.on('user.decision', (decision) => {
      this.analyzeUserDecision(decision.userId, decision);
    });
    
    eventBus.on('user.lesson_completed', (lesson) => {
      this.recordLessonCompletion(lesson.userId, lesson);
    });
  }
  
  public async initializeUserProfile(userId: string): Promise<UserLearningProfile> {
    // Check if profile already exists
    let profile = this.userProfiles.get(userId);
    if (profile) return profile;
    
    // Try to load from database
    profile = await this.loadUserProfile(userId);
    if (profile) {
      this.userProfiles.set(userId, profile);
      return profile;
    }
    
    // Create new profile
    profile = await this.createNewProfile(userId);
    this.userProfiles.set(userId, profile);
    await this.saveUserProfile(profile);
    
    return profile;
  }
  
  private async createNewProfile(userId: string): Promise<UserLearningProfile> {
    // Get user's trading history to assess starting level
    const tradingHistory = await this.getUserTradingHistory(userId);
    const startingLevel = this.assessInitialLevel(tradingHistory);
    
    const profile: UserLearningProfile = {
      userId,
      experienceLevel: startingLevel,
      learningVelocity: 0.5, // Average learning speed initially
      riskTolerance: 0.5, // Moderate risk tolerance initially
      preferredStrategies: [],
      weakAreas: ['risk_management', 'technical_analysis'], // Most users start weak here
      strongAreas: [],
      personalityType: 'analytical', // Default, will be learned
      
      decisionPatterns: {
        timeOfDay: {},
        marketConditions: {},
        positionSizing: {
          tendency: 'appropriate',
          avgSizeVsRecommended: 1.0
        },
        holdingPeriods: {
          preferred: 24, // 1 day default
          actual: []
        }
      },
      
      learningMilestones: [],
      
      adaptiveRecommendations: {
        currentFocus: ['risk_management', 'position_sizing'],
        nextLearningGoals: ['technical_analysis_basics', 'market_timing'],
        strategySuggestions: ['conservative_growth', 'index_following'],
        riskAdjustments: {
          positionSize: 0.8, // Start conservative
          stopLoss: 1.2, // Tighter stops initially
          diversification: 1.3 // More diversification initially
        }
      }
    };
    
    return profile;
  }
  
  private recordTradeAction(userId: string, trade: any): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Learn position sizing behavior
    const recommendedSize = this.calculateRecommendedSize(trade);
    const actualSize = trade.quantity * trade.price;
    const sizeRatio = actualSize / recommendedSize;
    
    profile.decisionPatterns.positionSizing.avgSizeVsRecommended = 
      (profile.decisionPatterns.positionSizing.avgSizeVsRecommended * 0.9 + sizeRatio * 0.1);
    
    if (sizeRatio > 1.2) {
      profile.decisionPatterns.positionSizing.tendency = 'over';
    } else if (sizeRatio < 0.8) {
      profile.decisionPatterns.positionSizing.tendency = 'under';
    } else {
      profile.decisionPatterns.positionSizing.tendency = 'appropriate';
    }
    
    // Learn time-of-day patterns
    const hour = new Date(trade.timestamp).getHours();
    profile.decisionPatterns.timeOfDay[hour] = (profile.decisionPatterns.timeOfDay[hour] || 0) + 1;
    
    // Adapt recommendations based on behavior
    this.adaptRecommendations(profile, trade);
    
    logService.log('debug', 'User trade action recorded', { userId, tradeId: trade.id });
  }
  
  private analyzeTradeOutcome(userId: string, outcome: any): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Update risk tolerance based on outcomes
    if (outcome.realized_pnl > 0) {
      // Successful trade
      if (outcome.max_drawdown_pct < 0.02) {
        // Low-risk successful trade - user can handle more risk
        profile.riskTolerance = Math.min(1.0, profile.riskTolerance + 0.01);
      }
    } else {
      // Losing trade
      if (outcome.max_drawdown_pct > 0.10) {
        // High-drawdown losing trade - reduce risk tolerance
        profile.riskTolerance = Math.max(0.1, profile.riskTolerance - 0.05);
      }
    }
    
    // Record holding period
    profile.decisionPatterns.holdingPeriods.actual.push(outcome.holding_period_hours);
    if (profile.decisionPatterns.holdingPeriods.actual.length > 20) {
      profile.decisionPatterns.holdingPeriods.actual.shift();
    }
    
    // Calculate preferred holding period
    const avgHolding = profile.decisionPatterns.holdingPeriods.actual.reduce((a, b) => a + b, 0) 
      / profile.decisionPatterns.holdingPeriods.actual.length;
    profile.decisionPatterns.holdingPeriods.preferred = avgHolding;
    
    // Update learning velocity based on improvement
    this.updateLearningVelocity(profile, outcome);
    
    // Check for level progression
    this.checkLevelProgression(profile);
  }
  
  private analyzeUserDecision(userId: string, decision: any): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Learn personality type from decisions
    if (decision.type === 'quick_action' && decision.timeToDecide < 60) {
      // Fast decisions indicate intuitive personality
      this.updatePersonalityScore(profile, 'intuitive', 0.1);
    } else if (decision.analysisTime > 300) {
      // Long analysis indicates analytical personality  
      this.updatePersonalityScore(profile, 'analytical', 0.1);
    }
    
    if (decision.riskLevel > 0.7) {
      this.updatePersonalityScore(profile, 'aggressive', 0.1);
    } else if (decision.riskLevel < 0.3) {
      this.updatePersonalityScore(profile, 'conservative', 0.1);
    }
  }
  
  private recordConceptLearning(userId: string, concept: string): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Add learning milestone
    profile.learningMilestones.push({
      concept,
      dateAchieved: new Date(),
      proficiencyScore: 0.7 // Initial proficiency
    });
    
    // Remove from weak areas, add to strong areas if mastered
    const weakIndex = profile.weakAreas.indexOf(concept);
    if (weakIndex > -1) {
      profile.weakAreas.splice(weakIndex, 1);
    }
    
    // Check if this concept makes an area strong
    const relatedSkill = this.findSkillForConcept(concept);
    if (relatedSkill && this.isSkillMastered(profile, relatedSkill)) {
      if (!profile.strongAreas.includes(relatedSkill)) {
        profile.strongAreas.push(relatedSkill);
      }
    }
    
    // Update learning velocity
    profile.learningVelocity = Math.min(1.0, profile.learningVelocity + 0.02);
    
    // Update focus areas
    this.updateFocusAreas(profile);
  }
  
  private recordLessonCompletion(userId: string, lesson: any): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;
    
    // Record the lesson concept as learned
    if (lesson.concept) {
      this.recordConceptLearning(userId, lesson.concept);
    }
    
    // Increase learning velocity for completing lessons
    profile.learningVelocity = Math.min(1.0, profile.learningVelocity + 0.05);
    
    logService.log('debug', 'Lesson completion recorded', { userId, lessonId: lesson.id });
  }
  
  private adaptRecommendations(profile: UserLearningProfile, trade: any): void {
    // Adapt position sizing recommendations
    if (profile.decisionPatterns.positionSizing.tendency === 'over') {
      profile.adaptiveRecommendations.riskAdjustments.positionSize = 
        Math.max(0.5, profile.adaptiveRecommendations.riskAdjustments.positionSize - 0.1);
    } else if (profile.decisionPatterns.positionSizing.tendency === 'under') {
      profile.adaptiveRecommendations.riskAdjustments.positionSize = 
        Math.min(1.5, profile.adaptiveRecommendations.riskAdjustments.positionSize + 0.05);
    }
    
    // Adapt stop loss recommendations based on user's risk tolerance
    if (profile.riskTolerance < 0.3) {
      profile.adaptiveRecommendations.riskAdjustments.stopLoss = 1.3; // Tighter stops
    } else if (profile.riskTolerance > 0.7) {
      profile.adaptiveRecommendations.riskAdjustments.stopLoss = 0.8; // Wider stops
    }
  }
  
  private checkLevelProgression(profile: UserLearningProfile): void {
    const currentLevel = profile.experienceLevel;
    const nextLevel = this.getNextLevel(currentLevel);
    
    if (nextLevel && this.meetsRequirements(profile, nextLevel)) {
      profile.experienceLevel = nextLevel;
      
      // Update recommendations for new level
      this.updateRecommendationsForLevel(profile, nextLevel);
      
      // Emit progression event
      eventBus.emit('user.level_progression', {
        userId: profile.userId,
        previousLevel: currentLevel,
        newLevel: nextLevel
      });
      
      logService.log('info', 'User level progression', { 
        userId: profile.userId, 
        from: currentLevel, 
        to: nextLevel 
      });
    }
  }
  
  private updateLearningVelocity(profile: UserLearningProfile, outcome: any): void {
    // Increase learning velocity if user is improving
    if (outcome.met_expectations) {
      profile.learningVelocity = Math.min(1.0, profile.learningVelocity + 0.01);
    } else {
      profile.learningVelocity = Math.max(0.1, profile.learningVelocity - 0.005);
    }
  }
  
  // Helper methods
  private assessInitialLevel(tradingHistory: any): UserLearningProfile['experienceLevel'] {
    if (!tradingHistory || tradingHistory.totalTrades < 5) {
      return 'beginner';
    } else if (tradingHistory.totalTrades < 50) {
      return 'intermediate';
    } else if (tradingHistory.winRate > 0.6) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }
  
  private calculateRecommendedSize(trade: any): number {
    // Calculate recommended position size based on portfolio and risk
    return 1000; // Mock implementation
  }
  
  private updatePersonalityScore(profile: UserLearningProfile, type: UserLearningProfile['personalityType'], weight: number): void {
    // This would update personality scores and determine dominant type
    profile.personalityType = type; // Simplified - would use weighted scoring
  }
  
  private findSkillForConcept(concept: string): string | undefined {
    for (const [skill, data] of Object.entries(this.SKILL_AREAS)) {
      if (data.components.includes(concept)) {
        return skill;
      }
    }
    return undefined;
  }
  
  private isSkillMastered(profile: UserLearningProfile, skill: string): boolean {
    const skillData = this.SKILL_AREAS[skill as keyof typeof this.SKILL_AREAS];
    if (!skillData) return false;
    
    const masteredComponents = skillData.components.filter(component =>
      profile.learningMilestones.some(m => m.concept === component && m.proficiencyScore > 0.8)
    );
    
    return masteredComponents.length >= skillData.components.length * 0.7; // 70% mastery
  }
  
  private updateFocusAreas(profile: UserLearningProfile): void {
    // Update current focus based on weak areas and level
    const levelFocus = this.getFocusForLevel(profile.experienceLevel);
    profile.adaptiveRecommendations.currentFocus = [
      ...profile.weakAreas.slice(0, 2),
      ...levelFocus.slice(0, 2)
    ];
  }
  
  private getFocusForLevel(level: UserLearningProfile['experienceLevel']): string[] {
    switch (level) {
      case 'beginner':
        return ['risk_management', 'position_sizing', 'basic_analysis'];
      case 'intermediate':
        return ['technical_analysis', 'portfolio_theory', 'market_timing'];
      case 'advanced':
        return ['advanced_strategies', 'risk_modeling', 'macro_analysis'];
      case 'expert':
        return ['innovation', 'teaching', 'strategy_development'];
      default:
        return ['risk_management'];
    }
  }
  
  private getNextLevel(current: UserLearningProfile['experienceLevel']): UserLearningProfile['experienceLevel'] | null {
    const levels: UserLearningProfile['experienceLevel'][] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(current);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }
  
  private meetsRequirements(profile: UserLearningProfile, level: UserLearningProfile['experienceLevel']): boolean {
    const requirements = this.MILESTONES[`${profile.experienceLevel}_to_${level}` as keyof typeof this.MILESTONES];
    if (!requirements) return false;
    
    // Check requirements (simplified)
    const hasRequiredConcepts = requirements.concepts_learned.every(concept =>
      profile.learningMilestones.some(m => m.concept === concept)
    );
    
    return hasRequiredConcepts; // Simplified - would check all requirements
  }
  
  private updateRecommendationsForLevel(profile: UserLearningProfile, level: UserLearningProfile['experienceLevel']): void {
    switch (level) {
      case 'intermediate':
        profile.adaptiveRecommendations.riskAdjustments.positionSize = 1.0;
        profile.adaptiveRecommendations.riskAdjustments.diversification = 1.1;
        break;
      case 'advanced':
        profile.adaptiveRecommendations.riskAdjustments.positionSize = 1.2;
        profile.adaptiveRecommendations.riskAdjustments.stopLoss = 0.9;
        break;
      case 'expert':
        profile.adaptiveRecommendations.riskAdjustments.positionSize = 1.5;
        profile.adaptiveRecommendations.riskAdjustments.diversification = 0.8;
        break;
    }
  }
  
  // Database operations
  private async loadUserProfile(userId: string): Promise<UserLearningProfile | null> {
    try {
      const { data } = await supabase
        .from('user_bid_profiles')
        .select('profile_data')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.profile_data && typeof data.profile_data === 'object' && 'learningProfile' in data.profile_data) {
        return (data.profile_data as any).learningProfile as UserLearningProfile;
      }
    } catch (error) {
      logService.log('error', 'Failed to load user profile', { error, userId });
    }
    
    return null;
  }
  
  private async saveUserProfile(profile: UserLearningProfile): Promise<void> {
    try {
      await supabase
        .from('user_bid_profiles')
        .upsert({
          user_id: profile.userId,
          profile_data: { learningProfile: profile } as any,
          last_updated: new Date().toISOString()
        });
    } catch (error) {
      logService.log('error', 'Failed to save user profile', { error, userId: profile.userId });
    }
  }
  
  private async getUserTradingHistory(userId: string): Promise<any> {
    // Mock implementation - would query actual trading history
    return {
      totalTrades: 0,
      winRate: 0.5,
      totalPnL: 0,
      tradingDays: 0
    };
  }
  
  // Public API
  public getUserProfile(userId: string): UserLearningProfile | null {
    return this.userProfiles.get(userId) || null;
  }
  
  public async updateUserProfile(userId: string, updates: Partial<UserLearningProfile>): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      Object.assign(profile, updates);
      await this.saveUserProfile(profile);
    }
  }
  
  public getPersonalizedRecommendations(userId: string): UserLearningProfile['adaptiveRecommendations'] | null {
    const profile = this.userProfiles.get(userId);
    return profile?.adaptiveRecommendations || null;
  }
  
  public recordManualLearning(userId: string, concept: string, proficiency: number = 0.7): void {
    this.recordConceptLearning(userId, concept);
  }
}

export const userProgression = new UserProgressionSystem();