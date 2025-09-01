// Governance Types - Risk management and trade control

export interface TradeIntent {
  id: string;
  botId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  strategy: string;
  confidence: number; // 0-1
  reasoning: string;
  stopLoss?: number;
  takeProfit?: number;
  maxRisk: number; // Maximum $ amount willing to lose
  createdAt: Date;
  expiresAt?: Date;
}

export interface RiskParameters {
  // Position limits
  maxPositionSize: number; // $ amount
  maxPositionPercent: number; // % of portfolio
  minStockPrice: number; // Exclude penny stocks
  minCapitalAllocation: number; // Minimum $ per trade
  
  // Portfolio limits
  maxPortfolioExposure: number; // % of total equity
  maxSectorExposure: number; // % per sector
  maxSingleStockExposure: number; // % per ticker
  maxDailyDrawdown: number; // % daily loss limit
  maxWeeklyDrawdown: number; // % weekly loss limit
  
  // Trading limits
  maxTradesPerDay: number;
  maxTradesPerBot: number;
  maxLeverage: number;
  
  // Risk metrics
  maxPortfolioVolatility: number;
  minSharpeRatio: number;
  maxConcentrationRisk: number;
  
  // Oracle integration
  respectOracleAlerts: boolean;
  oracleAlertThreshold: 'low' | 'medium' | 'high' | 'critical';
  
  lastUpdated: Date;
}

export interface GovernanceDecision {
  id: string;
  tradeIntentId: string;
  governor: 'monarch' | 'overseer';
  action: 'approve' | 'soft_pull' | 'hard_pull';
  reasoning: string;
  modifications?: TradeModification[];
  riskFactors: string[];
  confidence: number; // 0-1 confidence in decision
  processingTimeMs: number;
  createdAt: Date;
}

export interface TradeModification {
  field: 'quantity' | 'stopLoss' | 'takeProfit' | 'timeInForce';
  originalValue: any;
  newValue: any;
  reason: string;
}

export interface RiskAlert {
  id: string;
  type: 'soft_pull' | 'hard_pull' | 'threshold_breach' | 'oracle_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  symbol?: string;
  sector?: string;
  currentValue: number;
  thresholdValue: number;
  recommendedAction: string;
  governor: 'monarch' | 'overseer';
  acknowledged: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface CollapseSignal {
  symbol: string;
  collapseScore: number; // 0-1, higher = more likely to collapse
  factors: CollapseFactors;
  timeHorizon: '1d' | '1w' | '1m' | '3m';
  confidence: number; // 0-1
  recommendation: 'exit_immediately' | 'reduce_exposure' | 'monitor_closely' | 'no_action';
  generatedAt: Date;
}

export interface CollapseFactors {
  fundamentalDecline: number; // 0-1
  unusualVolume: number; // 0-1
  abnormalSpreads: number; // 0-1
  oracleRedFlags: number; // 0-1
  newsNegativeSentiment: number; // 0-1
  technicalBreakdown: number; // 0-1
}

export interface GovernanceMetrics {
  totalInterventions: number;
  softPulls: number;
  hardPulls: number;
  tradesApproved: number;
  tradesRejected: number;
  averageProcessingTime: number; // ms
  riskAlertsGenerated: number;
  portfolioSafetyScore: number; // 0-1
  lastUpdated: Date;
}

export interface MonarchContext {
  portfolioValue: number;
  availableCash: number;
  currentDrawdown: number;
  dailyDrawdown: number;
  weeklyDrawdown: number;
  sectorExposures: Record<string, number>;
  topPositions: Array<{symbol: string; exposure: number}>;
  volatility: number;
  concentrationRisk: number;
  activeBots: number;
  lastUpdated: Date;
}

export interface OverseerContext {
  symbol: string;
  currentPosition?: {
    quantity: number;
    averagePrice: number;
    marketValue: number;
    unrealizedPnL: number;
  };
  recentTrades: Array<{
    timestamp: Date;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  }>;
  priceVolatility: number;
  averageDailyVolume: number;
  currentVolume: number;
  bidAskSpread: number;
  oracleSignals: Array<{
    type: string;
    severity: string;
    timestamp: Date;
  }>;
  lastUpdated: Date;
}

export interface GovernanceEvent {
  type: 'trade_intent' | 'portfolio_breach' | 'oracle_alert' | 'collapse_detected';
  data: any;
  timestamp: Date;
  urgent: boolean;
}