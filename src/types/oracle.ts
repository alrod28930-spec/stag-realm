// Oracle data structures - separated to avoid circular dependencies

export interface MarketFeed {
  source: string;
  symbol?: string;
  sector?: string;
  dataType: 'price' | 'volume' | 'news' | 'options' | 'macro';
  rawData: any;
  timestamp: Date;
}

export interface ProcessedSignal {
  id: string;
  type: 'volatility_spike' | 'volume_surge' | 'sector_rotation' | 'earnings_beat' | 
        'news_sentiment' | 'options_flow' | 'macro_shift' | 'technical_breakout';
  symbol?: string;
  sector?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  signal: string;
  description: string;
  data: Record<string, any>;
  timestamp: Date;
  expiresAt?: Date;
  sources: string[];
}

export interface OracleAlert {
  id: string;
  type: 'risk_warning' | 'sector_crash' | 'volatility_spike' | 'earnings_surprise' | 
        'macro_event' | 'unusual_activity';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSymbols: string[];
  affectedSectors: string[];
  timestamp: Date;
  actionRequired: boolean;
  relatedSignals: string[];
}

export interface SectorHeatmap {
  [sector: string]: {
    performance: number; // % change
    volume: number;
    volatility: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    signals: number; // count of active signals
    lastUpdated: Date;
  };
}

export interface OracleContext {
  symbol?: string;
  recentSignals: ProcessedSignal[];
  marketSummary: string;
  keyFactors: string[];
  volatilityLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
}