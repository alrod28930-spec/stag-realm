// Data Compression and Summarization Types

export interface PriceTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  source: string;
}

export interface CandleData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startTime: Date;
  endTime: Date;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  tickCount: number; // number of ticks used to create this candle
}

export interface VolumeProfile {
  symbol: string;
  priceLevel: number;
  volume: number;
  percentage: number; // percentage of total volume at this level
  date: Date;
}

export interface VolatilityMetrics {
  symbol: string;
  period: string; // '1d', '1w', '1m'
  historicalVolatility: number;
  realizedVolatility: number;
  impliedVolatility?: number;
  volatilityRank: number; // 0-100 percentile
  calculatedAt: Date;
}

export interface NewsFeed {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: Date;
  symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number; // 0-1
  impact: 'high' | 'medium' | 'low';
}

export interface SentimentSummary {
  symbol?: string;
  sector?: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 to 1
  confidence: number; // 0-1
  keyPhrases: string[];
  newsCount: number;
  sourceBreakdown: { [source: string]: number };
  timeframe: string;
  generatedAt: Date;
}

export interface DataCompressionRule {
  dataType: 'price_ticks' | 'news_feeds' | 'trade_signals' | 'bot_logs';
  retentionPeriod: number; // days
  compressionRatio: number; // target compression ratio
  summaryMethod: 'candles' | 'averages' | 'sentiment' | 'key_events';
  archiveAfter: number; // days before moving to archive
  deleteAfter?: number; // days before permanent deletion (optional)
}

export interface CompressionJob {
  jobId: string;
  dataType: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  originalSize: number; // bytes
  compressedSize: number; // bytes
  compressionRatio: number;
  itemsProcessed: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface ArchiveMetadata {
  archiveId: string;
  dataType: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  originalSize: number;
  compressedSize: number;
  itemCount: number;
  compressionMethod: string;
  indexKeys: string[]; // searchable fields
  createdAt: Date;
  accessCount: number;
  lastAccessed?: Date;
}

export interface DataSummary {
  summaryId: string;
  dataType: string;
  period: string;
  keyMetrics: Record<string, number>;
  highlights: string[];
  trends: {
    direction: 'up' | 'down' | 'sideways';
    strength: number; // 0-1
    confidence: number; // 0-1
  };
  anomalies: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  }[];
  generatedAt: Date;
  expiresAt: Date;
}