// Learning System Types

export interface TradeOutcome {
  trade_id: string;
  realized_pnl: number;
  holding_period_hours: number;
  exit_reason: 'profit_target' | 'stop_loss' | 'time_exit' | 'manual' | 'risk_governor';
  max_drawdown_pct: number;
  max_gain_pct: number;
  was_profitable: boolean;
  met_expectations: boolean;
}

export interface LearningEvent {
  id: string;
  type: 'trade_execution' | 'signal_outcome' | 'bot_decision' | 'risk_event';
  timestamp: number;
  trade_id?: string;
  bot_id?: string;
  symbol?: string;
  pre_trade_signals: any[];
  intent_reasoning: string;
  execution_details: {
    price: number;
    quantity: number;
    slippage: number;
    fill_speed_ms: number;
  };
  market_context: Record<string, any>;
  workspace_id: string;
}

export interface BotPerformance {
  bot_id: string;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  accuracy_score: number; // 0-1, recent accuracy
  confidence_weight: number; // multiplier for bot decisions
  avg_holding_period: number;
  recent_outcomes: TradeOutcome[];
  last_updated: number;
}

export interface SignalEffectiveness {
  signal_type: string;
  source: string;
  total_signals: number;
  successful_predictions: number;
  effectiveness_score: number; // 0-1
  weight_multiplier: number; // applied to signal strength
  recent_outcomes: {
    was_correct: boolean;
    strength: number;
    timestamp: number;
  }[];
  last_updated: number;
}

export interface PortfolioLearning {
  successful_patterns: Map<string, number>; // pattern -> success rate
  failed_patterns: Map<string, number>; // pattern -> failure rate
  sector_performance: Map<string, number>; // sector -> avg performance
  timeframe_effectiveness: Map<string, number>; // timeframe -> effectiveness
  risk_tolerance_learned: number; // learned risk tolerance (0-1)
  preferred_holding_periods: {
    hours: number;
    was_profitable: boolean;
    pnl: number;
  }[];
  last_updated: number;
}

export interface LearningInsight {
  type: 'positive_trend' | 'negative_trend' | 'pattern_identified' | 'risk_adjustment' | 'holding_period_insight';
  confidence: number; // 0-1
  message: string;
  actionable: string; // actionable recommendation
  data: Record<string, any>;
}

export interface AdaptiveSettings {
  riskMultiplier: number; // multiplies base risk thresholds
  confidenceThreshold: number; // minimum confidence for trades
  signalWeights: Map<string, number>; // signal type -> weight multiplier
  botWeights: Map<string, number>; // bot id -> weight multiplier
  lastUpdated: number;
}

export interface LearningDashboard {
  overview: {
    total_trades: number;
    overall_win_rate: number;
    active_bots: number;
    learning_events: number;
  };
  top_performing_bots: BotPerformance[];
  recent_insights: LearningInsight[];
  adaptive_settings: AdaptiveSettings;
  performance_trends: {
    daily_pnl: number[];
    win_rate_trend: number[];
    risk_adjusted_returns: number[];
  };
}

export interface WorkspaceLearning {
  workspace_id: string;
  events: LearningEvent[];
  bot_performance: BotPerformance[];
  learning_summary: {
    total_events: number;
    learning_active: boolean;
    personalization_level: number; // 0-1, how personalized the system is
  };
}

// Subscription-based learning features
export interface SubscriptionLearningFeatures {
  basic: {
    max_learning_events: 1000;
    bot_performance_tracking: boolean;
    basic_insights: boolean;
  };
  standard: {
    max_learning_events: 10000;
    bot_performance_tracking: boolean;
    advanced_insights: boolean;
    adaptive_parameters: boolean;
  };
  pro: {
    max_learning_events: 100000;
    bot_performance_tracking: boolean;
    advanced_insights: boolean;
    adaptive_parameters: boolean;
    portfolio_personalization: boolean;
    export_learning_data: boolean;
  };
  elite: {
    max_learning_events: -1; // unlimited
    bot_performance_tracking: boolean;
    advanced_insights: boolean;
    adaptive_parameters: boolean;
    portfolio_personalization: boolean;
    export_learning_data: boolean;
    custom_learning_models: boolean;
  };
}

export interface PersonalizationProfile {
  user_id: string;
  workspace_id: string;
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  learned_preferences: {
    preferred_sectors: string[];
    optimal_holding_periods: number[];
    risk_tolerance: number;
    position_sizing_preference: number;
  };
  performance_history: {
    best_strategies: string[];
    worst_strategies: string[];
    seasonal_patterns: Record<string, number>;
  };
  last_updated: number;
}

// Legacy types for compatibility
export interface PatternMatch {
  patternId: string;
  type: 'signal_accuracy' | 'trade_success' | 'risk_pattern' | 'market_regime';
  description: string;
  occurrences: number;
  successRate: number; // 0-1
  averageReturn?: number;
  confidence: number; // 0-1
  timeframe: string; // '1h', '1d', '1w', etc.
  conditions: PatternCondition[];
  lastSeen: Date;
  strength: 'weak' | 'moderate' | 'strong';
}

export interface PatternCondition {
  field: string; // e.g., 'volatility', 'volume', 'sector'
  operator: 'gt' | 'lt' | 'eq' | 'between' | 'contains';
  value: any;
  weight: number; // 0-1, importance of this condition
}

export interface PatternInsights {
  totalPatterns: number;
  strongPatterns: PatternMatch[];
  emergingPatterns: PatternMatch[];
  failingPatterns: PatternMatch[];
  recommendations: string[];
  confidenceLevel: number; // 0-1
  lastUpdated: Date;
}

export interface PredictiveModel {
  modelId: string;
  type: 'risk_prediction' | 'return_prediction' | 'volatility_forecast' | 'signal_scoring';
  description: string;
  accuracy: number; // 0-1, historical accuracy
  features: string[]; // input features used
  lastTrained: Date;
  trainingDataSize: number;
  version: string;
  isActive: boolean;
}

export interface RiskPrediction {
  symbol?: string;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  timeHorizon: string; // '1h', '1d', '1w'
  riskFactors: string[];
  confidence: number; // 0-1
  generatedAt: Date;
  expiresAt: Date;
}

export interface ReturnPrediction {
  symbol: string;
  expectedReturn: number; // percentage
  confidence: number; // 0-1
  timeHorizon: string;
  upside: number;
  downside: number;
  volatility: number;
  generatedAt: Date;
  modelUsed: string;
}

export interface LearningMetrics {
  totalTrades: number;
  successfulTrades: number;
  successRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  patternsIdentified: number;
  modelAccuracy: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdated: Date;
}

export interface FeedbackLoop {
  loopId: string;
  sourceSystem: 'oracle' | 'trade_bots' | 'monarch' | 'overseer';
  targetSystem: 'oracle' | 'trade_bots' | 'monarch' | 'overseer';
  feedbackType: 'signal_accuracy' | 'risk_adjustment' | 'performance_update';
  data: any;
  processedAt: Date;
  impact: 'high' | 'medium' | 'low';
}