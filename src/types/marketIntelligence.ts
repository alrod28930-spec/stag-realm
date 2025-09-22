// Market Intelligence & Learning Types for Enhanced BID

export interface MarketPattern {
  id: string;
  type: 'breakout' | 'reversal' | 'consolidation' | 'trend' | 'volatility_spike' | 'earnings_reaction';
  timeframe: '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
  confidence: number; // 0-1
  successRate: number; // historical success rate
  conditions: {
    technical: Record<string, number>; // RSI, MA, etc.
    fundamental?: Record<string, any>;
    sentiment?: number;
    volume?: number;
  };
  expectedMoves: {
    probability: number;
    direction: 'up' | 'down' | 'sideways';
    magnitude: number; // expected % move
    timeframe: number; // expected time in hours
  }[];
  relatedSymbols: string[];
  sectorImpact: Record<string, number>;
  createdAt: Date;
  lastSeen: Date;
  occurrenceCount: number;
}

export interface MarketRegime {
  id: string;
  name: string;
  type: 'bull' | 'bear' | 'sideways' | 'volatile' | 'low_vol';
  startDate: Date;
  endDate?: Date;
  characteristics: {
    volatility: number;
    correlation: number;
    momentum: number;
    meanReversion: number;
  };
  successfulStrategies: string[];
  failedStrategies: string[];
  keyIndicators: Record<string, number>;
  learningConfidence: number;
}

export interface MarketLesson {
  id: string;
  type: 'pattern' | 'regime' | 'event' | 'user_behavior' | 'strategy';
  lesson: string;
  evidence: {
    occurrences: number;
    successRate: number;
    avgOutcome: number;
    timespan: number; // days of evidence
  };
  conditions: Record<string, any>;
  actionable: string;
  confidence: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  lastValidated: Date;
  userId?: string; // user-specific lessons
}

export interface UserLearningProfile {
  userId: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learningVelocity: number; // how fast user learns (0-1)
  riskTolerance: number; // learned from behavior (0-1)
  preferredStrategies: string[];
  weakAreas: string[]; // areas needing improvement
  strongAreas: string[]; // areas of expertise
  personalityType: 'aggressive' | 'conservative' | 'analytical' | 'intuitive';
  
  decisionPatterns: {
    timeOfDay: Record<string, number>; // when they trade best
    marketConditions: Record<string, number>; // which conditions they handle well
    positionSizing: {
      tendency: 'under' | 'over' | 'appropriate';
      avgSizeVsRecommended: number;
    };
    holdingPeriods: {
      preferred: number; // hours
      actual: number[]; // recent holding periods
    };
  };
  
  learningMilestones: {
    concept: string;
    dateAchieved: Date;
    proficiencyScore: number;
  }[];
  
  adaptiveRecommendations: {
    currentFocus: string[];
    nextLearningGoals: string[];
    strategySuggestions: string[];
    riskAdjustments: {
      positionSize: number; // multiplier
      stopLoss: number; // tighter or wider
      diversification: number; // more or less
    };
  };
}

export interface StrategyEvolution {
  strategyId: string;
  name: string;
  originalParameters: Record<string, any>;
  currentParameters: Record<string, any>;
  evolutionHistory: {
    timestamp: Date;
    change: string;
    reason: string;
    performance: {
      before: number;
      after: number;
    };
  }[];
  
  learningMetrics: {
    adaptationCount: number;
    improvementRate: number; // % improvement from learning
    stabilityScore: number; // how stable the strategy has become
    overallPerformance: number;
  };
  
  marketConditionPerformance: Record<string, {
    winRate: number;
    avgReturn: number;
    volatility: number;
    adaptations: number;
  }>;
  
  userSpecificLearning: Record<string, {
    personalizedParameters: Record<string, any>;
    userPerformance: number;
    adaptationHistory: any[];
  }>;
}

export interface BIDIntelligence {
  marketUnderstanding: {
    currentRegime: MarketRegime;
    detectedPatterns: MarketPattern[];
    activeThemes: string[];
    riskFactors: string[];
    opportunities: string[];
  };
  
  userGrowth: {
    currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    progressToNext: number; // 0-100%
    recentLearning: MarketLesson[];
    recommendedFocus: string[];
    personalizedInsights: string[];
  };
  
  strategyIntelligence: {
    topPerforming: StrategyEvolution[];
    emerging: string[];
    declining: string[];
    recommendations: {
      strategy: string;
      confidence: number;
      reasoning: string;
      expectedReturn: number;
      riskLevel: number;
    }[];
  };
  
  marketMemory: {
    criticalLessons: MarketLesson[];
    recentPatterns: MarketPattern[];
    seasonalEffects: Record<string, any>;
    correlationLearning: Record<string, number>;
  };
}