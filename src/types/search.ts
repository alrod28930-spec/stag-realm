// Market Search Types - Advanced search and recommendations system

export interface SearchQuery {
  id: string;
  ownerId?: string;
  queryText: string;
  filters: SearchFilters;
  notify: boolean;
  createdAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
}

export interface SearchFilters {
  sectors?: string[];
  marketCaps?: ('micro' | 'small' | 'mid' | 'large' | 'mega')[];
  timeframe?: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  eventTypes?: ('earnings' | 'dividends' | 'fed' | 'news' | 'analyst' | 'technical')[];
  momentum?: 'high' | 'medium' | 'low';
  volatility?: 'high' | 'medium' | 'low';
  volume?: 'high' | 'medium' | 'low';
  beta?: { min?: number; max?: number };
  price?: { min?: number; max?: number };
}

export interface SearchResult {
  id: string;
  queryId: string;
  symbol: string;
  name: string;
  relevanceScore: number; // 0-1
  matchedFeatures: string[];
  timestamp: Date;
  features: SearchResultFeatures;
}

export interface SearchResultFeatures {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  beta: number;
  momentum: number; // 0-1
  volatility: number; // 0-1
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sector: string;
  upcomingEvents: UpcomingEvent[];
  technicalSignals: TechnicalSignal[];
  newsCount: number;
  analystRating: 'buy' | 'hold' | 'sell';
  priceHistory: number[]; // For sparklines
}

export interface UpcomingEvent {
  type: 'earnings' | 'dividends' | 'fed' | 'conference' | 'announcement';
  date: Date;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface TechnicalSignal {
  type: 'breakout' | 'support' | 'resistance' | 'trend_change' | 'volume_spike';
  strength: number; // 0-1
  direction: 'bullish' | 'bearish';
  description: string;
  timestamp: Date;
}

export interface Recommendation {
  id: string;
  symbol: string;
  name: string;
  score: number; // 0-1 overall recommendation score
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  timeframe: 'short' | 'medium' | 'long';
  whyBullets: string[]; // 2-3 bullet points explaining the recommendation
  keyStats: RecommendationStats;
  relatedEventIds: string[];
  relatedSignalIds: string[];
  lastUpdated: Date;
  dataFreshness: Date;
  priceHistory: number[]; // For mini sparkline
}

export interface RecommendationStats {
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  atr: number; // Average True Range
  momentum: number; // 0-1
  earningsDays?: number; // Days until/since earnings
  volume: number;
  avgVolume: number;
  beta: number;
  rsi?: number;
  sector: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  resultCount: number;
  lastAlert?: Date;
  alertsEnabled: boolean;
  createdAt: Date;
}

export interface SearchAlert {
  id: string;
  savedSearchId: string;
  searchName: string;
  newResults: SearchResult[];
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface MarketSearchContext {
  totalResults: number;
  queryProcessingTime: number;
  dataFreshness: Date;
  appliedFilters: SearchFilters;
  suggestedQueries: string[];
  relatedSearches: SavedSearch[];
}

export interface AdvancedQuery {
  raw: string;
  parsed: AdvancedQueryNode;
  isValid: boolean;
  error?: string;
}

export interface AdvancedQueryNode {
  type: 'AND' | 'OR' | 'NOT' | 'FIELD' | 'VALUE';
  field?: string;
  operator?: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value?: any;
  children?: AdvancedQueryNode[];
}

export interface SearchMode {
  type: 'simple' | 'advanced';
  query: string;
  filters: SearchFilters;
  sortBy: 'relevance' | 'momentum' | 'volume' | 'change' | 'alphabetical';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}