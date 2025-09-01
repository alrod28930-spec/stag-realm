import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid } from './bid';
import { recorder } from './recorder';
import {
  SearchQuery,
  SearchResult,
  SearchFilters,
  Recommendation,
  SavedSearch,
  SearchAlert,
  MarketSearchContext,
  AdvancedQuery,
  SearchMode,
  SearchResultFeatures,
  UpcomingEvent,
  TechnicalSignal,
  RecommendationStats
} from '../types/search';

// Market Search Service - Advanced search and recommendations
export class MarketSearchService {
  private savedSearches: SavedSearch[] = [];
  private searchHistory: SearchQuery[] = [];
  private activeAlerts: SearchAlert[] = [];
  private recommendations: Recommendation[] = [];
  private lastUpdate = new Date();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for Oracle signals to update recommendations
    eventBus.on('bid.oracle_signal_added', (signal: any) => {
      this.updateRecommendationsFromSignal(signal).catch(error => {
        logService.log('error', 'Failed to update recommendations from Oracle signal', { error });
      });
    });

    // Periodic recommendation refresh
    setInterval(() => {
      this.refreshRecommendations().catch(error => {
        logService.log('error', 'Failed to refresh recommendations', { error });
      });
    }, 300000); // Every 5 minutes

    // Check for saved search alerts
    setInterval(() => {
      this.checkSavedSearchAlerts().catch(error => {
        logService.log('error', 'Failed to check saved search alerts', { error });
      });
    }, 60000); // Every minute

    logService.log('info', 'Market Search Service initialized');
  }

  // Execute search query
  async executeSearch(mode: SearchMode): Promise<{
    results: SearchResult[];
    context: MarketSearchContext;
  }> {
    const startTime = Date.now();

    try {
      // Record search request
      const searchQuery: SearchQuery = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        queryText: mode.query,
        filters: mode.filters,
        notify: false,
        createdAt: new Date(),
        isActive: true
      };

      this.searchHistory.unshift(searchQuery);
      this.searchHistory = this.searchHistory.slice(0, 100); // Keep last 100 searches

      // Record in Recorder
      recorder.recordOracleSignal({
        type: 'search_requested',
        signal: `Market search: ${mode.query}`,
        data: {
          query: mode.query,
          filters: mode.filters,
          searchMode: mode.type
        }
      });

      // Emit for repository processing
      eventBus.emit('search.requested', searchQuery);

      // Generate mock search results (in real implementation, this would query actual data)
      const results = await this.generateSearchResults(searchQuery, mode);

      // Create context
      const context: MarketSearchContext = {
        totalResults: results.length,
        queryProcessingTime: Date.now() - startTime,
        dataFreshness: new Date(),
        appliedFilters: mode.filters,
        suggestedQueries: this.generateSuggestedQueries(mode.query),
        relatedSearches: this.getRelatedSearches(mode.query)
      };

      // Emit search completed
      eventBus.emit('search.completed', { searchQuery, results, context });

      logService.log('info', 'Search executed successfully', {
        query: mode.query,
        resultCount: results.length,
        processingTime: context.queryProcessingTime
      });

      return { results, context };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'Search execution failed', { 
        error: errorMessage,
        query: mode.query 
      });
      throw error;
    }
  }

  // Generate search results (mock implementation)
  private async generateSearchResults(query: SearchQuery, mode: SearchMode): Promise<SearchResult[]> {
    // Mock symbols that might match various searches
    const mockSymbols = [
      'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX',
      'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PLTR',
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA',
      'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'BMY', 'LLY', 'TMO'
    ];

    const results: SearchResult[] = [];

    // Filter symbols based on query
    const relevantSymbols = this.filterSymbolsByQuery(mockSymbols, query);

    for (const symbol of relevantSymbols.slice(0, mode.limit)) {
      const features = this.generateMockFeatures(symbol);
      const relevanceScore = this.calculateRelevanceScore(query, features);

      results.push({
        id: `result_${Date.now()}_${symbol}`,
        queryId: query.id,
        symbol,
        name: this.getSymbolName(symbol),
        relevanceScore,
        matchedFeatures: this.getMatchedFeatures(query, features),
        timestamp: new Date(),
        features
      });
    }

    // Sort by relevance or user preference
    return this.sortResults(results, mode.sortBy, mode.sortOrder);
  }

  // Generate mock features for a symbol
  private generateMockFeatures(symbol: string): SearchResultFeatures {
    const basePrice = 50 + Math.random() * 500;
    const change = (Math.random() - 0.5) * 20;
    
    return {
      price: basePrice,
      change,
      changePercent: (change / basePrice) * 100,
      volume: Math.floor(1000000 + Math.random() * 10000000),
      marketCap: Math.floor(1000000000 + Math.random() * 100000000000),
      beta: 0.5 + Math.random() * 1.5,
      momentum: Math.random(),
      volatility: Math.random(),
      sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
      sector: this.getSectorForSymbol(symbol),
      upcomingEvents: this.generateUpcomingEvents(),
      technicalSignals: this.generateTechnicalSignals(),
      newsCount: Math.floor(Math.random() * 20),
      analystRating: Math.random() > 0.6 ? 'buy' : Math.random() > 0.3 ? 'hold' : 'sell',
      priceHistory: Array.from({ length: 30 }, () => basePrice + (Math.random() - 0.5) * 50)
    };
  }

  // Generate recommendations
  async generateRecommendations(limit = 10): Promise<Recommendation[]> {
    try {
      const oracleSignals = bid.getOracleSignals(20);
      const portfolio = bid.getPortfolio();
      
      const recommendations: Recommendation[] = [];
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX'];

      for (const symbol of symbols.slice(0, limit)) {
        const relevantSignals = oracleSignals.filter(s => s.symbol === symbol);
        const recommendation = this.createRecommendation(symbol, relevantSignals);
        recommendations.push(recommendation);
      }

      // Sort by score
      recommendations.sort((a, b) => b.score - a.score);

      this.recommendations = recommendations;
      this.lastUpdate = new Date();

      // Record recommendations generated
      recorder.recordOracleSignal({
        type: 'recommendations_generated', 
        signal: `Generated ${recommendations.length} recommendations`,
        data: {
          recommendationCount: recommendations.length,
          topSymbols: recommendations.slice(0, 3).map(r => r.symbol)
        }
      });

      return recommendations;

    } catch (error) {
      logService.log('error', 'Failed to generate recommendations', { error });
      return [];
    }
  }

  // Create individual recommendation
  private createRecommendation(symbol: string, signals: any[]): Recommendation {
    const features = this.generateMockFeatures(symbol);
    const whyBullets = this.generateWhyBullets(symbol, signals, features);
    
    // Calculate score based on signals and features
    let score = 0.5; // Base score
    if (signals.length > 0) {
      score += signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length * 0.3;
    }
    score += features.momentum * 0.2;
    score = Math.min(Math.max(score, 0), 1);

    return {
      id: `rec_${Date.now()}_${symbol}`,
      symbol,
      name: this.getSymbolName(symbol),
      score,
      direction: features.sentiment,
      confidence: 0.7 + Math.random() * 0.3,
      timeframe: Math.random() > 0.5 ? 'medium' : 'short',
      whyBullets,
      keyStats: this.createRecommendationStats(features),
      relatedEventIds: [],
      relatedSignalIds: signals.map(s => s.id),
      lastUpdated: new Date(),
      dataFreshness: new Date(),
      priceHistory: features.priceHistory.slice(-14) // Last 14 days for sparkline
    };
  }

  // Generate "Why" bullets for recommendation
  private generateWhyBullets(symbol: string, signals: any[], features: SearchResultFeatures): string[] {
    const bullets: string[] = [];

    // Based on momentum
    if (features.momentum > 0.7) {
      bullets.push(`Strong momentum: ${(features.momentum * 100).toFixed(0)}% momentum score`);
    }

    // Based on signals
    if (signals.length > 0) {
      const criticalSignals = signals.filter(s => s.severity === 'critical' || s.severity === 'high');
      if (criticalSignals.length > 0) {
        bullets.push(`${criticalSignals.length} high-priority Oracle signals detected`);
      }
    }

    // Based on upcoming events
    if (features.upcomingEvents.length > 0) {
      const nearEvents = features.upcomingEvents.filter(e => 
        (e.date.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 // Within 7 days
      );
      if (nearEvents.length > 0) {
        bullets.push(`${nearEvents[0].type} event in ${Math.ceil((nearEvents[0].date.getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days`);
      }
    }

    // Based on volume
    if (features.volume > features.volume * 1.5) { // Mock comparison
      bullets.push('Unusual volume activity detected');
    }

    // Based on analyst rating
    if (features.analystRating === 'buy') {
      bullets.push('Positive analyst consensus rating');
    }

    // Based on technical signals
    const bullishSignals = features.technicalSignals.filter(s => s.direction === 'bullish');
    if (bullishSignals.length > 0) {
      bullets.push(`${bullishSignals.length} bullish technical patterns identified`);
    }

    // Default bullets if none generated
    if (bullets.length === 0) {
      bullets.push('Market conditions favor this position');
      bullets.push('Risk/reward profile appears favorable');
    }

    return bullets.slice(0, 3); // Maximum 3 bullets
  }

  // Create recommendation stats
  private createRecommendationStats(features: SearchResultFeatures): RecommendationStats {
    return {
      currentPrice: features.price,
      targetPrice: features.price * (1 + (Math.random() - 0.3) * 0.4), // ±40% potential
      stopLoss: features.price * (1 - Math.random() * 0.15), // Up to 15% stop loss
      atr: features.price * (0.02 + Math.random() * 0.08), // 2-10% ATR
      momentum: features.momentum,
      earningsDays: Math.floor(Math.random() * 30) - 15, // ±15 days
      volume: features.volume,
      avgVolume: features.volume * (0.8 + Math.random() * 0.4), // ±20% of current
      beta: features.beta,
      rsi: 30 + Math.random() * 40, // RSI between 30-70
      sector: features.sector
    };
  }

  // Save search query
  async saveSearch(name: string, query: SearchQuery, alertsEnabled = false): Promise<SavedSearch> {
    const savedSearch: SavedSearch = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      query: { ...query, notify: alertsEnabled },
      resultCount: 0,
      alertsEnabled,
      createdAt: new Date()
    };

    this.savedSearches.unshift(savedSearch);
    this.savedSearches = this.savedSearches.slice(0, 50); // Keep last 50 saved searches

    // Record in Recorder
    recorder.recordOracleSignal({
      type: 'search_saved',
      signal: `Saved search: ${name}`,
      data: {
        searchName: name,
        query: query.queryText,
        alertsEnabled
      }
    });

    eventBus.emit('search.saved', savedSearch);
    
    logService.log('info', 'Search saved', { name, alertsEnabled });
    
    return savedSearch;
  }

  // Check saved searches for new alerts
  private async checkSavedSearchAlerts(): Promise<void> {
    const alertEnabledSearches = this.savedSearches.filter(s => s.alertsEnabled);
    
    for (const savedSearch of alertEnabledSearches) {
      try {
        // Re-run the search
        const mode: SearchMode = {
          type: 'simple',
          query: savedSearch.query.queryText,
          filters: savedSearch.query.filters,
          sortBy: 'relevance',
          sortOrder: 'desc',
          limit: 10,
          offset: 0
        };

        const { results } = await this.executeSearch(mode);
        
        // Check if there are new high-relevance results
        const highRelevanceResults = results.filter(r => r.relevanceScore > 0.8);
        
        if (highRelevanceResults.length > 0) {
          const alert: SearchAlert = {
            id: `alert_${Date.now()}_${savedSearch.id}`,
            savedSearchId: savedSearch.id,
            searchName: savedSearch.name,
            newResults: highRelevanceResults,
            triggeredAt: new Date(),
            acknowledged: false
          };

          this.activeAlerts.unshift(alert);
          this.activeAlerts = this.activeAlerts.slice(0, 20); // Keep last 20 alerts

          // Update saved search
          savedSearch.lastAlert = new Date();
          savedSearch.resultCount = results.length;

          // Emit alert
          eventBus.emit('alert.created', alert);
          
          // Record alert
          recorder.recordOracleAlert({
            id: alert.id,
            title: `Search alert: ${savedSearch.name}`,
            type: 'search_alert',
            message: alert.searchName,
            data: {
              searchName: savedSearch.name,
              newResultCount: highRelevanceResults.length,
              topSymbols: highRelevanceResults.slice(0, 3).map(r => r.symbol)
            }
          });

          logService.log('info', 'Search alert triggered', {
            searchName: savedSearch.name,
            resultCount: highRelevanceResults.length
          });
        }

      } catch (error) {
        logService.log('error', 'Failed to check saved search alert', {
          searchName: savedSearch.name,
          error
        });
      }
    }
  }

  // Update recommendations from Oracle signal
  private async updateRecommendationsFromSignal(signal: any): Promise<void> {
    if (!signal.symbol) return;

    // Find existing recommendation for this symbol
    const existingIndex = this.recommendations.findIndex(r => r.symbol === signal.symbol);
    
    if (existingIndex >= 0) {
      // Update existing recommendation
      const existing = this.recommendations[existingIndex];
      existing.relatedSignalIds.push(signal.id);
      existing.lastUpdated = new Date();
      existing.dataFreshness = new Date();
      
      // Recalculate score and why bullets
      const allSignals = bid.getOracleSignalsBySymbol(signal.symbol, 10);
      const features = this.generateMockFeatures(signal.symbol);
      existing.whyBullets = this.generateWhyBullets(signal.symbol, allSignals, features);
      
      // Adjust score based on new signal
      if (signal.severity === 'critical') {
        existing.score = Math.min(existing.score + 0.2, 1.0);
      } else if (signal.severity === 'high') {
        existing.score = Math.min(existing.score + 0.1, 1.0);
      }
      
    } else if (this.recommendations.length < 20) {
      // Create new recommendation
      const newRecommendation = this.createRecommendation(signal.symbol, [signal]);
      this.recommendations.push(newRecommendation);
    }

    // Re-sort recommendations
    this.recommendations.sort((a, b) => b.score - a.score);
    
    eventBus.emit('recommendations.updated', this.recommendations.slice(0, 10));
  }

  // Refresh recommendations periodically
  private async refreshRecommendations(): Promise<void> {
    try {
      await this.generateRecommendations();
      eventBus.emit('recommendations.updated', this.recommendations);
      
    } catch (error) {
      logService.log('error', 'Failed to refresh recommendations', { error });
    }
  }

  // Helper methods
  private filterSymbolsByQuery(symbols: string[], query: SearchQuery): string[] {
    // Simple filtering logic - in real implementation would be more sophisticated
    const queryLower = query.queryText.toLowerCase();
    
    return symbols.filter(symbol => {
      // Match symbol name
      if (symbol.toLowerCase().includes(queryLower)) return true;
      
      // Match sector filter
      if (query.filters.sectors?.length) {
        const symbolSector = this.getSectorForSymbol(symbol);
        if (query.filters.sectors.includes(symbolSector)) return true;
      }
      
      return false;
    });
  }

  private calculateRelevanceScore(query: SearchQuery, features: SearchResultFeatures): number {
    let score = 0.5; // Base score
    
    // Query text matching
    if (query.queryText.toLowerCase().includes(features.sector.toLowerCase())) {
      score += 0.3;
    }
    
    // Filter matching
    if (query.filters.sentiment && query.filters.sentiment === features.sentiment) {
      score += 0.2;
    }
    
    // Recent performance
    if (Math.abs(features.changePercent) > 5) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private getMatchedFeatures(query: SearchQuery, features: SearchResultFeatures): string[] {
    const matched: string[] = [];
    
    if (query.filters.sentiment === features.sentiment) {
      matched.push('sentiment');
    }
    
    if (query.filters.sectors?.includes(features.sector)) {
      matched.push('sector');
    }
    
    if (features.upcomingEvents.length > 0) {
      matched.push('events');
    }
    
    return matched;
  }

  private sortResults(results: SearchResult[], sortBy: string, order: 'asc' | 'desc'): SearchResult[] {
    const multiplier = order === 'desc' ? -1 : 1;
    
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.relevanceScore - a.relevanceScore) * multiplier;
        case 'momentum':
          return (b.features.momentum - a.features.momentum) * multiplier;
        case 'volume':
          return (b.features.volume - a.features.volume) * multiplier;
        case 'change':
          return (b.features.changePercent - a.features.changePercent) * multiplier;
        case 'alphabetical':
          return a.symbol.localeCompare(b.symbol) * multiplier;
        default:
          return (b.relevanceScore - a.relevanceScore) * multiplier;
      }
    });
  }

  private generateSuggestedQueries(currentQuery: string): string[] {
    // Mock suggested queries
    return [
      'high momentum tech stocks',
      'earnings this week',
      'dividend aristocrats',
      'biotech breakouts',
      'energy sector rotation'
    ];
  }

  private getRelatedSearches(query: string): SavedSearch[] {
    // Return saved searches that might be related
    return this.savedSearches.filter(s => 
      s.query.queryText.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(s.query.queryText.toLowerCase())
    ).slice(0, 3);
  }

  private generateUpcomingEvents(): UpcomingEvent[] {
    const events: UpcomingEvent[] = [];
    const eventTypes = ['earnings', 'dividends', 'conference', 'announcement'] as const;
    
    // 0-3 upcoming events
    const eventCount = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < eventCount; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30));
      
      events.push({
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        date: futureDate,
        description: 'Scheduled event',
        importance: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      });
    }
    
    return events;
  }

  private generateTechnicalSignals(): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const signalTypes = ['breakout', 'support', 'resistance', 'trend_change', 'volume_spike'] as const;
    
    // 0-3 technical signals
    const signalCount = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < signalCount; i++) {
      signals.push({
        type: signalTypes[Math.floor(Math.random() * signalTypes.length)],
        strength: Math.random(),
        direction: Math.random() > 0.5 ? 'bullish' : 'bearish',
        description: 'Technical pattern detected',
        timestamp: new Date()
      });
    }
    
    return signals;
  }

  private getSectorForSymbol(symbol: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'NVDA': 'Technology',
      'AMD': 'Technology',
      'INTC': 'Technology',
      'TSLA': 'Consumer Discretionary',
      'NFLX': 'Consumer Discretionary',
      'AMZN': 'Consumer Discretionary',
      'META': 'Communication',
      'JPM': 'Financial',
      'BAC': 'Financial',
      'WFC': 'Financial',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'UNH': 'Healthcare'
    };
    
    return sectorMap[symbol] || 'Technology';
  }

  private getSymbolName(symbol: string): string {
    const nameMap: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corp.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corp.',
      'AMD': 'Advanced Micro Devices',
      'INTC': 'Intel Corp.',
      'AMZN': 'Amazon Inc.',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.',
      'JPM': 'JPMorgan Chase',
      'BAC': 'Bank of America',
      'WFC': 'Wells Fargo',
      'JNJ': 'Johnson & Johnson',
      'PFE': 'Pfizer Inc.',
      'UNH': 'UnitedHealth Group'
    };
    
    return nameMap[symbol] || symbol;
  }

  // Public methods
  getRecommendations(limit = 10): Recommendation[] {
    return this.recommendations.slice(0, limit);
  }

  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches];
  }

  getActiveAlerts(): SearchAlert[] {
    return this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      
      recorder.recordOracleSignal({
        type: 'alert_acknowledged',
        signal: `Alert acknowledged: ${alert.searchName}`,
        data: { alertId, searchName: alert.searchName }
      });
      
      return true;
    }
    return false;
  }

  async deleteSavedSearch(searchId: string): Promise<boolean> {
    const index = this.savedSearches.findIndex(s => s.id === searchId);
    if (index >= 0) {
      const deleted = this.savedSearches.splice(index, 1)[0];
      
      recorder.recordOracleSignal({
        type: 'search_deleted',
        signal: `Deleted saved search: ${deleted.name}`,
        data: { searchId, searchName: deleted.name }
      });
      
      return true;
    }
    return false;
  }

  getSearchHistory(limit = 20): SearchQuery[] {
    return this.searchHistory.slice(0, limit);
  }

  getLastUpdate(): Date {
    return this.lastUpdate;
  }
}

// Export singleton
export const marketSearchService = new MarketSearchService();