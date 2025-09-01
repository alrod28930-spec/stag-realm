// Trade Bot Types - Automated strategy modules with compliance safeguards

export type BotStatus = 'off' | 'simulation' | 'live';
export type BotStrategy = 'momentum' | 'breakout' | 'mean_reversion' | 'signal_stacking' | 'volatility';

export interface TradeBot {
  id: string;
  name: string;
  strategy: BotStrategy;
  status: BotStatus;
  allocation: number; // $ amount allocated to this bot
  riskTolerance: number; // 0-1
  createdAt: Date;
  lastActive: Date;
  
  // Performance tracking
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageHoldTime: number; // hours
  
  // Configuration
  config: BotConfig;
  
  // Current state
  isActive: boolean;
  currentPositions: number;
  dailyTradeCount: number;
  lastTradeAt?: Date;
}

export interface BotConfig {
  maxPositionSize: number; // $ amount
  maxDailyTrades: number;
  minConfidenceThreshold: number; // 0-1
  stopLossPercent: number;
  takeProfitPercent: number;
  
  // Strategy-specific parameters
  strategyParams: Record<string, any>;
  
  // Risk parameters
  maxDrawdownPercent: number;
  minStockPrice: number;
  blacklistedSymbols: string[];
}

export interface PreTradeJournal {
  id: string;
  botId: string;
  symbol: string;
  timestamp: Date;
  
  // The "why" behind the trade
  hypothesis: string;
  supportingSignals: string[];
  riskMarkers: string[];
  confidenceScore: number; // 0-1
  
  // Signal sources
  oracleSignals: Array<{
    type: string;
    strength: number;
    source: string;
  }>;
  
  bidSignals: Array<{
    type: string;
    value: number;
    timeframe: string;
  }>;
  
  // Trade details
  proposedAction: 'buy' | 'sell';
  proposedQuantity: number;
  proposedPrice?: number;
  expectedOutcome: string;
}

export interface BotResearchResult {
  symbol: string;
  signals: ResearchSignal[];
  overallScore: number; // 0-1
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-1
  reasoning: string[];
  timestamp: Date;
}

export interface ResearchSignal {
  type: 'momentum' | 'volume' | 'volatility' | 'sentiment' | 'technical' | 'fundamental';
  strength: number; // 0-1
  direction: 'bullish' | 'bearish' | 'neutral';
  timeframe: string;
  description: string;
  source: string;
}

export interface BotMetrics {
  totalBots: number;
  activeBots: number;
  totalAllocation: number;
  totalTradesDaily: number;
  averagePerformance: number;
  topPerformer: string;
  worstPerformer: string;
  systemUptime: number; // percentage
  lastUpdated: Date;
}

export interface BotEvent {
  type: 'bot.created' | 'bot.activated' | 'bot.deactivated' | 'bot.trade_intent' | 'bot.research_complete';
  botId: string;
  data: any;
  timestamp: Date;
}

export interface StrategyModule {
  name: BotStrategy;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  
  // Strategy implementation
  research(symbols: string[], context: any): Promise<BotResearchResult[]>;
  generateTradeIntent(result: BotResearchResult, bot: TradeBot): Promise<any>;
  updateParameters(performance: any): BotConfig['strategyParams'];
}