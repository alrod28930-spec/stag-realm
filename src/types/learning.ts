// Learning Engine Types - Pattern recognition and predictive modeling

export interface TradeOutcome {
  tradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  duration?: number; // milliseconds
  outcome: 'win' | 'loss' | 'breakeven' | 'open';
  executedAt: Date;
  closedAt?: Date;
  relatedSignals: string[]; // Oracle signal IDs that influenced this trade
  botId?: string;
  confidence?: number; // 0-1, how confident the bot was
}

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