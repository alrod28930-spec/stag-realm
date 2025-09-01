// Recommendation Engine - Query parsing, signal matching, relevance ranking

import { 
  RelevanceScore, 
  SignalStrength, 
  BotConfidence,
  AlertSeverity 
} from '@/types/core';
import { 
  calculateRelevance, 
  calculateRecencyWeight,
  calculatePortfolioOverlap,
  calculateVolatilityFit 
} from '@/utils/formulas';
import { generateULID } from '@/utils/ulid';
import { SYSTEM_LIMITS } from '@/utils/constants';
import { eventBus } from './eventBus';
import { logService } from './logging';

export interface SearchQuery {
  id: string;
  owner_id: string;
  query_text: string;
  filters: SearchFilters;
  notify: boolean;
  created_ts: Date;
  last_run_ts?: Date;
}

export interface SearchFilters {
  sectors?: string[];
  market_cap?: 'micro' | 'small' | 'mid' | 'large' | 'mega';
  timeframe?: '1d' | '1w' | '1m' | '3m' | '1y';
  sentiment?: 'bearish' | 'neutral' | 'bullish';
  event_types?: string[];
  price_range?: [number, number];
  volume_threshold?: number;
  beta_range?: [number, number];
}

export interface SearchResult {
  id: string;
  query_id: string;
  symbol: string;
  relevance_score: RelevanceScore;
  features: SearchFeatures;
  timestamp: Date;
}

export interface SearchFeatures {
  price: number;
  volume: number;
  market_cap: number;
  sector: string;
  beta: number;
  signals: ProcessedSignal[];
  news_sentiment: number;
  technical_score: number;
  fundamental_score: number;
}

export interface ProcessedSignal {
  type: string;
  strength: SignalStrength;
  direction: -1 | 0 | 1;
  source: string;
  timestamp: Date;
}

export interface Recommendation {
  symbol: string;
  reason_bullets: string[];
  score: RelevanceScore;
  confidence: BotConfidence;
  last_update_ts: Date;
  related_event_ids: string[];
  action_suggestion?: 'watch' | 'research' | 'consider_entry' | 'avoid';
  risk_level: 'low' | 'medium' | 'high';
  time_horizon: '1d' | '1w' | '1m';
}

export interface QueryParseResult {
  symbols: string[];
  sectors: string[];
  keywords: string[];
  operators: ParsedOperator[];
  timeframe?: string;
  confidence: number;
}

export interface ParsedOperator {
  field: string;
  operator: 'AND' | 'OR' | 'NOT' | '>' | '<' | '=';
  value: string | number;
}

class RecommendationEngine {
  private savedQueries: Map<string, SearchQuery> = new Map();
  private searchResults: Map<string, SearchResult[]> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private portfolioSymbols: string[] = [];
  private preferredVolatilityRange: [number, number] = [0.2, 0.8];

  constructor() {
    this.initializeEventListeners();
    this.startPeriodicUpdates();
  }

  private initializeEventListeners() {
    // Listen for new oracle signals to update recommendations
    eventBus.on('oracle.signal.created', (signal) => {
      this.processNewSignal(signal);
    });

    // Listen for portfolio updates
    eventBus.on('portfolio.updated', (data) => {
      if (data.positions) {
        this.portfolioSymbols = data.positions.map((p: any) => p.symbol);
      }
    });

    // Listen for saved query notifications
    eventBus.on('recommendation.query_matched', (data) => {
      this.handleQueryMatch(data);
    });
  }

  private startPeriodicUpdates() {
    // Update recommendations every 5 minutes
    setInterval(() => {
      this.refreshRecommendations();
    }, 5 * 60 * 1000);
  }

  // Query Parsing
  public parseQuery(queryText: string): QueryParseResult {
    const result: QueryParseResult = {
      symbols: [],
      sectors: [],
      keywords: [],
      operators: [],
      confidence: 0
    };

    const text = queryText.toLowerCase().trim();
    
    // Extract symbols (3-4 letter codes)
    const symbolMatches = text.match(/\b[A-Z]{3,4}\b/gi);
    if (symbolMatches) {
      result.symbols = symbolMatches.map(s => s.toUpperCase());
    }

    // Extract sectors
    const sectorKeywords = ['tech', 'finance', 'healthcare', 'energy', 'consumer'];
    result.sectors = sectorKeywords.filter(sector => text.includes(sector));

    // Extract timeframes
    const timeframeMatch = text.match(/\b(\d+[dw]\b|\b(?:day|week|month|year)s?\b)/i);
    if (timeframeMatch) {
      result.timeframe = this.normalizeTimeframe(timeframeMatch[1]);
    }

    // Extract operators (advanced query mode)
    const operatorMatches = text.match(/(\w+):([\w\d<>=!]+)/g);
    if (operatorMatches) {
      result.operators = operatorMatches.map(match => {
        const [field, value] = match.split(':');
        return {
          field,
          operator: this.detectOperator(value),
          value: this.parseValue(value)
        };
      });
    }

    // Extract general keywords
    const words = text.split(/\s+/).filter(word => 
      word.length > 2 && 
      !result.symbols.includes(word.toUpperCase()) &&
      !result.sectors.includes(word)
    );
    result.keywords = words;

    // Calculate parsing confidence
    result.confidence = this.calculateParsingConfidence(result);

    return result;
  }

  private normalizeTimeframe(timeframe: string): string {
    if (timeframe.includes('d') || timeframe.includes('day')) return '1d';
    if (timeframe.includes('w') || timeframe.includes('week')) return '1w';
    if (timeframe.includes('m') || timeframe.includes('month')) return '1m';
    if (timeframe.includes('y') || timeframe.includes('year')) return '1y';
    return '1w';
  }

  private detectOperator(value: string): ParsedOperator['operator'] {
    if (value.includes('>')) return '>';
    if (value.includes('<')) return '<';
    if (value.includes('=')) return '=';
    return 'AND';
  }

  private parseValue(value: string): string | number {
    const cleanValue = value.replace(/[<>=!]/g, '');
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? cleanValue : numValue;
  }

  private calculateParsingConfidence(result: QueryParseResult): number {
    let confidence = 0.3; // Base confidence
    
    if (result.symbols.length > 0) confidence += 0.3;
    if (result.sectors.length > 0) confidence += 0.2;
    if (result.timeframe) confidence += 0.1;
    if (result.operators.length > 0) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  // Signal Matching and Ranking
  public async searchAndRank(query: SearchQuery): Promise<SearchResult[]> {
    const parseResult = this.parseQuery(query.query_text);
    const candidateSymbols = await this.getCandidateSymbols(parseResult, query.filters);
    
    const results: SearchResult[] = [];
    
    for (const symbol of candidateSymbols) {
      const features = await this.getSymbolFeatures(symbol);
      const relevanceScore = this.calculateSymbolRelevance(symbol, features, parseResult);
      
      if (relevanceScore > 0.3) { // Minimum relevance threshold
        results.push({
          id: generateULID('res_'),
          query_id: query.id,
          symbol,
          relevance_score: relevanceScore,
          features,
          timestamp: new Date()
        });
      }
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.relevance_score - a.relevance_score);
    
    // Limit results
    const limitedResults = results.slice(0, SYSTEM_LIMITS.MAX_SEARCH_RESULTS);
    
    // Store results
    this.searchResults.set(query.id, limitedResults);
    
    // Emit search completed event
    eventBus.emit('search.completed', {
      queryId: query.id,
      resultCount: limitedResults.length,
      topSymbols: limitedResults.slice(0, 5).map(r => r.symbol)
    });

    return limitedResults;
  }

  private async getCandidateSymbols(parseResult: QueryParseResult, filters: SearchFilters): Promise<string[]> {
    // Mock symbol universe - would query real market data
    const mockSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD',
      'JPM', 'BAC', 'GS', 'MS', 'WFC', 'C',
      'JNJ', 'PFE', 'UNH', 'ABBV', 'BMY',
      'XOM', 'CVX', 'COP', 'SLB', 'EOG'
    ];

    let candidates = mockSymbols;

    // Filter by specified symbols
    if (parseResult.symbols.length > 0) {
      candidates = candidates.filter(symbol => 
        parseResult.symbols.includes(symbol)
      );
    }

    // Apply additional filters
    if (filters.sectors && filters.sectors.length > 0) {
      candidates = candidates.filter(symbol => 
        this.getSymbolSector(symbol).some(sector => 
          filters.sectors!.includes(sector)
        )
      );
    }

    return candidates;
  }

  private getSymbolSector(symbol: string): string[] {
    // Mock sector mapping - would use real data
    const sectorMap: Record<string, string[]> = {
      'AAPL': ['tech', 'consumer'],
      'MSFT': ['tech'],
      'GOOGL': ['tech'],
      'AMZN': ['tech', 'consumer'],
      'TSLA': ['auto', 'tech'],
      'JPM': ['finance'],
      'BAC': ['finance'],
      'JNJ': ['healthcare'],
      'PFE': ['healthcare'],
      'XOM': ['energy'],
      'CVX': ['energy']
    };
    
    return sectorMap[symbol] || ['other'];
  }

  private async getSymbolFeatures(symbol: string): Promise<SearchFeatures> {
    // Mock features - would fetch real data
    return {
      price: 100 + Math.random() * 500,
      volume: 1000000 + Math.random() * 5000000,
      market_cap: 10000000000 + Math.random() * 1000000000000,
      sector: this.getSymbolSector(symbol)[0],
      beta: 0.5 + Math.random() * 1.5,
      signals: this.getMockSignals(symbol),
      news_sentiment: -1 + Math.random() * 2,
      technical_score: Math.random(),
      fundamental_score: Math.random()
    };
  }

  private getMockSignals(symbol: string): ProcessedSignal[] {
    const signalTypes = ['momentum', 'volume', 'volatility', 'sentiment', 'earnings'];
    const signals: ProcessedSignal[] = [];
    
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      signals.push({
        type: signalTypes[Math.floor(Math.random() * signalTypes.length)],
        strength: Math.random(),
        direction: [-1, 0, 1][Math.floor(Math.random() * 3)] as -1 | 0 | 1,
        source: 'mock_feed',
        timestamp: new Date(Date.now() - Math.random() * 3600000)
      });
    }
    
    return signals;
  }

  private calculateSymbolRelevance(
    symbol: string, 
    features: SearchFeatures, 
    parseResult: QueryParseResult
  ): RelevanceScore {
    // Get strongest signal
    const strongestSignal = features.signals.reduce((max, signal) => 
      signal.strength > max.strength ? signal : max, 
      { strength: 0 } as ProcessedSignal
    );

    const relevanceComponents = {
      signal_strength: strongestSignal.strength,
      portfolio_overlap: calculatePortfolioOverlap(symbol, this.portfolioSymbols),
      recency_weight: calculateRecencyWeight(strongestSignal.timestamp || new Date()),
      volatility_fit: calculateVolatilityFit(features.beta, this.preferredVolatilityRange)
    };

    return calculateRelevance(relevanceComponents);
  }

  // Recommendation Generation
  public generateRecommendations(searchResults: SearchResult[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    for (const result of searchResults.slice(0, SYSTEM_LIMITS.MAX_RECOMMENDATIONS)) {
      const recommendation = this.createRecommendation(result);
      recommendations.push(recommendation);
      this.recommendations.set(result.symbol, recommendation);
    }

    return recommendations;
  }

  private createRecommendation(result: SearchResult): Recommendation {
    const features = result.features;
    const signals = features.signals;
    
    // Generate reason bullets based on signals and features
    const reasonBullets = this.generateReasonBullets(features, signals);
    
    // Determine action suggestion
    const actionSuggestion = this.determineActionSuggestion(result.relevance_score, signals);
    
    // Calculate confidence
    const confidence = Math.min(100, result.relevance_score * 100 + Math.random() * 20);
    
    return {
      symbol: result.symbol,
      reason_bullets: reasonBullets,
      score: result.relevance_score,
      confidence,
      last_update_ts: new Date(),
      related_event_ids: signals.map(s => generateULID('evt_')),
      action_suggestion: actionSuggestion,
      risk_level: this.assessRiskLevel(features),
      time_horizon: this.determineTimeHorizon(signals)
    };
  }

  private generateReasonBullets(features: SearchFeatures, signals: ProcessedSignal[]): string[] {
    const bullets: string[] = [];
    
    // Signal-based bullets
    const strongSignals = signals.filter(s => s.strength > 0.6);
    if (strongSignals.length > 0) {
      const signal = strongSignals[0];
      const direction = signal.direction > 0 ? 'bullish' : signal.direction < 0 ? 'bearish' : 'neutral';
      bullets.push(`Strong ${signal.type} signal showing ${direction} momentum`);
    }

    // Volume-based bullet
    if (features.volume > 2000000) {
      bullets.push(`Above-average volume indicates institutional interest`);
    }

    // Technical bullet
    if (features.technical_score > 0.7) {
      bullets.push(`Technical indicators suggest favorable entry conditions`);
    }

    // Sentiment bullet
    if (Math.abs(features.news_sentiment) > 0.5) {
      const sentiment = features.news_sentiment > 0 ? 'positive' : 'negative';
      bullets.push(`Recent news sentiment is ${sentiment}`);
    }

    // Beta bullet
    if (features.beta < 0.8) {
      bullets.push(`Low beta suggests defensive characteristics`);
    } else if (features.beta > 1.3) {
      bullets.push(`High beta indicates growth potential with higher risk`);
    }

    return bullets.slice(0, 3); // Max 3 bullets
  }

  private determineActionSuggestion(relevanceScore: RelevanceScore, signals: ProcessedSignal[]): Recommendation['action_suggestion'] {
    if (relevanceScore > 0.8) return 'consider_entry';
    if (relevanceScore > 0.6) return 'research';
    if (relevanceScore > 0.4) return 'watch';
    return 'avoid';
  }

  private assessRiskLevel(features: SearchFeatures): Recommendation['risk_level'] {
    const riskFactors = [
      features.beta > 1.5 ? 1 : 0,
      Math.abs(features.news_sentiment) > 0.8 ? 1 : 0,
      features.technical_score < 0.3 ? 1 : 0
    ];
    
    const riskScore = riskFactors.reduce((sum, factor) => sum + factor, 0);
    
    if (riskScore >= 2) return 'high';
    if (riskScore === 1) return 'medium';
    return 'low';
  }

  private determineTimeHorizon(signals: ProcessedSignal[]): Recommendation['time_horizon'] {
    const momentumSignals = signals.filter(s => s.type === 'momentum');
    if (momentumSignals.length > 0 && momentumSignals[0].strength > 0.8) {
      return '1d'; // Strong momentum suggests short-term opportunity
    }
    
    const fundamentalSignals = signals.filter(s => s.type === 'earnings' || s.type === 'fundamental');
    if (fundamentalSignals.length > 0) {
      return '1m'; // Fundamental signals suggest longer-term plays
    }
    
    return '1w'; // Default weekly horizon
  }

  // Saved Queries and Notifications
  public saveQuery(queryText: string, filters: SearchFilters, notify: boolean, ownerId: string): SearchQuery {
    const query: SearchQuery = {
      id: generateULID('qry_'),
      owner_id: ownerId,
      query_text: queryText,
      filters,
      notify,
      created_ts: new Date()
    };
    
    this.savedQueries.set(query.id, query);
    
    eventBus.emit('search.query_saved', {
      queryId: query.id,
      notify,
      ownerId
    });
    
    return query;
  }

  public getSavedQueries(ownerId: string): SearchQuery[] {
    return Array.from(this.savedQueries.values())
      .filter(query => query.owner_id === ownerId);
  }

  private processNewSignal(signal: ProcessedSignal) {
    // Check if this signal matches any saved queries with notifications enabled
    const notifyQueries = Array.from(this.savedQueries.values())
      .filter(query => query.notify);
    
    for (const query of notifyQueries) {
      if (this.signalMatchesQuery(signal, query)) {
        this.handleQueryMatch({
          queryId: query.id,
          signal,
          matchType: 'new_signal'
        });
      }
    }
  }

  private signalMatchesQuery(signal: ProcessedSignal, query: SearchQuery): boolean {
    const parseResult = this.parseQuery(query.query_text);
    
    // Simple matching logic - would be more sophisticated in reality
    return parseResult.keywords.some(keyword => 
      signal.type.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private handleQueryMatch(data: { queryId: string; signal: ProcessedSignal; matchType: string }) {
    const query = this.savedQueries.get(data.queryId);
    if (!query) return;
    
    // Create alert for query match
    eventBus.emit('alert.created', {
      id: generateULID('alrt_'),
      severity: AlertSeverity.INFO,
      title: 'Saved Search Match',
      message: `Your saved search "${query.query_text}" found new results`,
      data: {
        queryId: query.id,
        signal: data.signal,
        matchType: data.matchType
      },
      created_at: new Date(),
      acknowledged: false
    });

    // Update query last run timestamp
    query.last_run_ts = new Date();
  }

  private refreshRecommendations() {
    logService.log('info', 'Refreshing recommendations', {
      recommendationCount: this.recommendations.size
    });
    
    // Would refresh recommendations based on new data
    eventBus.emit('recommendations.refreshed', {
      count: this.recommendations.size,
      timestamp: new Date()
    });
  }

  // Public API
  public async performSearch(queryText: string, filters: SearchFilters = {}, ownerId: string): Promise<{
    results: SearchResult[];
    recommendations: Recommendation[];
    parseResult: QueryParseResult;
  }> {
    const query: SearchQuery = {
      id: generateULID('qry_'),
      owner_id: ownerId,
      query_text: queryText,
      filters,
      notify: false,
      created_ts: new Date(),
      last_run_ts: new Date()
    };

    const parseResult = this.parseQuery(queryText);
    const results = await this.searchAndRank(query);
    const recommendations = this.generateRecommendations(results);

    return {
      results,
      recommendations,
      parseResult
    };
  }

  public getRecommendations(limit: number = SYSTEM_LIMITS.MAX_RECOMMENDATIONS): Recommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public getRecommendation(symbol: string): Recommendation | undefined {
    return this.recommendations.get(symbol);
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();