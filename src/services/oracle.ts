import { logService } from './logging';
import { eventBus } from './eventBus';
import { repository } from './repository';
import { recorder } from './recorder';
import { serviceManager } from './serviceManager';
import type { ProcessedSignal, OracleAlert, SectorHeatmap, OracleContext, MarketFeed } from '@/types/oracle';
import { supabase } from '@/integrations/supabase/client';

// Re-export types for backward compatibility
export type { ProcessedSignal, OracleAlert, SectorHeatmap, OracleContext, MarketFeed };

class OracleService {
  private signals: ProcessedSignal[] = [];
  private alerts: OracleAlert[] = [];
  private sectorHeatmap: SectorHeatmap = {};
  private lastRefresh: Date = new Date();
  private isActive: boolean = true;
  
  // Mock data feeds - in production, these would be real API connections
  private feedSources = [
    'yahoo_finance',
    'alpha_vantage', 
    'news_api',
    'options_flow',
    'macro_indicators'
  ];

  constructor() {
    this.initializeEventListeners();
    this.initializeSectorHeatmap();
    
    // Only start data feeds if not in demo mode
    if (!this.isDemoMode()) {
      this.startDataFeeds();
    }
  }

  private isDemoMode(): boolean {
    // Check if we're in SINGLE demo account mode (for landing page display only)
    if (typeof window !== 'undefined') {
      const authStore = (window as any).__authStore;
      return authStore?.user?.email === 'demo@example.com' && 
             authStore?.user?.id === '00000000-0000-0000-0000-000000000000';
    }
    return false;
  }

  private initializeEventListeners() {
    // Listen for external data feeds
    eventBus.on('cradle.csv_imported', (data) => {
      this.processExternalFeed({
        source: 'cradle_csv',
        dataType: 'price',
        rawData: data,
        timestamp: new Date()
      });
    });

    // Listen for broker data updates
    eventBus.on('repository.snapshot_cleaned', (data) => {
      this.processMarketContext(data);
    });

    // Listen for portfolio changes that might affect signals
    eventBus.on('portfolio.updated', (data) => {
      this.adjustSignalsForPortfolio(data);
    });
  }

  private initializeSectorHeatmap() {
    const sectors = [
      'Technology', 'Healthcare', 'Financials', 'Energy', 
      'Consumer Discretionary', 'Industrials', 'Materials',
      'Consumer Staples', 'Utilities', 'Real Estate', 'Communications'
    ];

    this.sectorHeatmap = sectors.reduce((heatmap, sector) => {
      heatmap[sector] = {
        performance: (Math.random() - 0.5) * 4, // -2% to +2%
        volume: Math.random() * 2, // 0x to 2x normal
        volatility: Math.random() * 0.5 + 0.1, // 10% to 60%
        sentiment: Math.random() > 0.5 ? 'positive' : Math.random() > 0.25 ? 'neutral' : 'negative',
        signals: Math.floor(Math.random() * 5),
        lastUpdated: new Date()
      };
      return heatmap;
    }, {} as SectorHeatmap);
  }

  private async startDataFeeds() {
    // Register this service
    serviceManager.registerService('oracle', this, () => this.cleanup());
    
    // Simulate real-time data feeds
    serviceManager.createInterval('oracle', () => {
      if (this.isActive) {
        this.simulateMarketData();
      }
    }, 30000); // Update every 30 seconds

    serviceManager.startService('oracle');
    
    // Initial data load
    this.simulateMarketData();
  }

  private cleanup(): void {
    logService.log('info', 'Oracle service cleanup completed');
  }

  private async simulateMarketData() {
    try {
      // Try to fetch real market data first
      const realTimeData = await this.fetchRealTimeMarketData();
      const marketData = await this.gatherMarketData();
      
      // Combine real-time and synthetic data
      const combinedData = this.combineDataSources(realTimeData, marketData);
      const signals = await this.processMarketData(combinedData);
      
      // Process the generated signals
      for (const signal of signals) {
        await this.processSignal(signal);
      }
    } catch (error) {
      // Fallback to mock data if real data fails
      logService.log('warn', 'Real-time data failed, using mock data', { error });
      const mockSignals = this.generateMockSignals();
      
      for (const signal of mockSignals) {
        await this.processSignal(signal);
      }
    }

    // Update sector heatmap
    this.updateSectorHeatmap();
    
    // Check for alerts
    this.checkForAlerts();
    
    this.lastRefresh = new Date();
    
    // Emit refresh event
    eventBus.emit('oracle.refreshed', {
      signalCount: this.signals.length,
      alertCount: this.alerts.length,
      timestamp: this.lastRefresh
    });
  }

  private async fetchRealTimeMarketData(): Promise<any[]> {
    try {
      // Skip real-time data for demo users
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.id === '00000000-0000-0000-0000-000000000000') {
        return []; // Return empty array for demo users
      }

      const { data, error } = await supabase.functions.invoke('oracle-realtime-data', {
        body: {
          symbols: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'],
          dataTypes: ['price', 'volume', 'news'],
          timeframe: '1Min'
        }
      });

      if (error) {
        logService.log('error', 'Failed to fetch real-time data', { error });
        return [];
      }

      return data?.data || [];
    } catch (error) {
      logService.log('error', 'Real-time data fetch error', { error });
      return [];
    }
  }

  private async gatherMarketData(): Promise<MarketFeed[]> {
    // Generate synthetic market data as fallback
    const feeds: MarketFeed[] = [];
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
    
    symbols.forEach(symbol => {
      feeds.push({
        source: 'synthetic',
        symbol,
        dataType: 'price',
        rawData: {
          price: Math.random() * 200 + 50,
          volume: Math.floor(Math.random() * 1000000),
          change: (Math.random() - 0.5) * 10
        },
        timestamp: new Date()
      });
    });
    
    return feeds;
  }

  private combineDataSources(realTimeData: any[], syntheticData: MarketFeed[]): MarketFeed[] {
    const combined: MarketFeed[] = [...syntheticData];
    
    // Convert real-time data to MarketFeed format
    realTimeData.forEach(dataSet => {
      if (dataSet.type === 'price' && dataSet.data) {
        dataSet.data.forEach((priceData: any) => {
          combined.push({
            source: 'alpaca_realtime',
            symbol: priceData.symbol,
            dataType: 'price',
            rawData: priceData,
            timestamp: new Date(priceData.timestamp || Date.now())
          });
        });
      }
      
      if (dataSet.type === 'volume' && dataSet.data) {
        dataSet.data.forEach((volumeData: any) => {
          combined.push({
            source: 'alpaca_realtime',
            symbol: volumeData.symbol,
            dataType: 'volume',
            rawData: volumeData,
            timestamp: new Date()
          });
        });
      }
      
      if (dataSet.type === 'news' && dataSet.data) {
        dataSet.data.forEach((newsItem: any) => {
          combined.push({
            source: 'alpaca_news',
            dataType: 'news',
            rawData: newsItem,
            timestamp: new Date(newsItem.timestamp || Date.now())
          });
        });
      }
    });
    
    return combined;
  }

  private async processMarketData(marketData: MarketFeed[]): Promise<ProcessedSignal[]> {
    const signals: ProcessedSignal[] = [];
    
    // Analyze price movements for signals
    const priceFeeds = marketData.filter(feed => feed.dataType === 'price');
    const volumeFeeds = marketData.filter(feed => feed.dataType === 'volume');
    const newsFeeds = marketData.filter(feed => feed.dataType === 'news');
    
    // Generate signals based on real data patterns
    priceFeeds.forEach(feed => {
      if (feed.rawData.price && feed.symbol) {
        // Check for significant price movements
        const change = Math.abs(feed.rawData.change || 0);
        if (change > 2) {
          signals.push({
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'volatility_spike',
            symbol: feed.symbol,
            sector: this.getSymbolSector(feed.symbol),
            severity: change > 5 ? 'high' : 'medium',
            direction: (feed.rawData.change || 0) > 0 ? 'bullish' : 'bearish',
            confidence: Math.min(0.95, 0.6 + change * 0.05),
            signal: `${feed.symbol} significant price movement detected`,
            description: `${feed.symbol} moved ${change.toFixed(2)}% indicating potential market catalyst`,
            data: { priceChange: change, price: feed.rawData.price },
            timestamp: feed.timestamp,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            sources: [feed.source]
          });
        }
      }
    });
    
    // Analyze volume for unusual activity
    volumeFeeds.forEach(feed => {
      if (feed.rawData.volumeRatio && feed.rawData.volumeRatio > 2) {
        signals.push({
          id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'volume_surge',
          symbol: feed.symbol,
          sector: this.getSymbolSector(feed.symbol),
          severity: feed.rawData.volumeRatio > 4 ? 'high' : 'medium',
          direction: 'neutral',
          confidence: Math.min(0.9, 0.5 + feed.rawData.volumeRatio * 0.1),
          signal: `${feed.symbol} unusual volume activity`,
          description: `Volume is ${feed.rawData.volumeRatio.toFixed(1)}x above average`,
          data: feed.rawData,
          timestamp: feed.timestamp,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
          sources: [feed.source]
        });
      }
    });
    
    // Process news sentiment
    newsFeeds.forEach(feed => {
      if (feed.rawData.headline && feed.rawData.symbols?.length > 0) {
        const sentiment = this.analyzeNewsSentiment(feed.rawData.headline);
        if (sentiment !== 'neutral') {
          feed.rawData.symbols.forEach((symbol: string) => {
            signals.push({
              id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'news_sentiment',
              symbol,
              sector: this.getSymbolSector(symbol),
              severity: 'medium',
              direction: sentiment === 'positive' ? 'bullish' : 'bearish',
              confidence: 0.7,
              signal: `${symbol} news sentiment ${sentiment}`,
              description: feed.rawData.headline.substring(0, 200),
              data: { headline: feed.rawData.headline, url: feed.rawData.url },
              timestamp: feed.timestamp,
              expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              sources: [feed.source]
            });
          });
        }
      }
    });
    
    return signals;
  }

  private getSymbolSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology', 
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'META': 'Technology',
      'NVDA': 'Technology',
      'SPY': 'Market',
      'QQQ': 'Technology'
    };
    
    return sectorMap[symbol] || 'Technology';
  }

  private analyzeNewsSentiment(headline: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['beat', 'surge', 'growth', 'up', 'gain', 'rise', 'boost', 'strong'];
    const negativeWords = ['miss', 'drop', 'fall', 'down', 'loss', 'decline', 'weak', 'cut'];
    
    const lowerHeadline = headline.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerHeadline.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerHeadline.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private generateMockSignals(): ProcessedSignal[] {
    const signalTypes: ProcessedSignal['type'][] = [
      'volatility_spike', 'volume_surge', 'sector_rotation', 'earnings_beat',
      'news_sentiment', 'options_flow', 'technical_breakout'
    ];

    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META'];
    const sectors = Object.keys(this.sectorHeatmap);

    const signals: ProcessedSignal[] = [];

    // Generate 1-3 new signals
    const numSignals = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numSignals; i++) {
      const type = signalTypes[Math.floor(Math.random() * signalTypes.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]; // Always provide valid symbol
      const sector = sectors[Math.floor(Math.random() * sectors.length)]; // Always provide valid sector
      
      signals.push({
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        symbol,
        sector,
        severity: this.randomSeverity(),
        direction: Math.random() > 0.5 ? 'bullish' : Math.random() > 0.25 ? 'bearish' : 'neutral',
        confidence: Math.random() * 0.4 + 0.6, // 60-100%
        signal: this.generateSignalText(type, symbol, sector),
        description: this.generateSignalDescription(type, symbol, sector),
        data: this.generateSignalData(type),
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        sources: [this.feedSources[Math.floor(Math.random() * this.feedSources.length)]]
      });
    }

    return signals;
  }

  private randomSeverity(): ProcessedSignal['severity'] {
    const rand = Math.random();
    if (rand > 0.9) return 'critical';
    if (rand > 0.7) return 'high';
    if (rand > 0.4) return 'medium';
    return 'low';
  }

  private generateSignalText(type: ProcessedSignal['type'], symbol?: string, sector?: string): string {
    const target = symbol || sector || 'Market';
    
    switch (type) {
      case 'volatility_spike':
        return `${target} volatility spike detected`;
      case 'volume_surge':
        return `${target} unusual volume surge`;
      case 'sector_rotation':
        return `Rotation into ${sector || 'defensive'} sectors`;
      case 'earnings_beat':
        return `${symbol || 'Company'} earnings beat expectations`;
      case 'news_sentiment':
        return `${target} positive news sentiment shift`;
      case 'options_flow':
        return `${symbol || 'Large cap'} unusual options activity`;
      case 'technical_breakout':
        return `${symbol || 'Index'} technical breakout pattern`;
      default:
        return `${target} market signal`;
    }
  }

  private generateSignalDescription(type: ProcessedSignal['type'], symbol?: string, sector?: string): string {
    const target = symbol || sector || 'market';
    
    switch (type) {
      case 'volatility_spike':
        return `Detected significant increase in ${target} volatility, suggesting increased uncertainty or pending price movement.`;
      case 'volume_surge':
        return `${target.toUpperCase()} experiencing volume 3x above average, indicating institutional interest or news catalyst.`;
      case 'sector_rotation':
        return `Capital flows suggesting rotation from growth to value sectors, potentially signaling market cycle shift.`;
      case 'earnings_beat':
        return `${symbol} reported earnings above consensus estimates, likely to drive near-term price appreciation.`;
      case 'news_sentiment':
        return `Sentiment analysis shows improving narrative around ${target}, potentially supportive of price action.`;
      case 'options_flow':
        return `Large options trades detected in ${symbol}, suggesting informed money positioning for significant move.`;
      case 'technical_breakout':
        return `${target.toUpperCase()} broke above key resistance level, confirming bullish technical pattern.`;
      default:
        return `Market intelligence signal detected for ${target}.`;
    }
  }

  private generateSignalData(type: ProcessedSignal['type']): Record<string, any> {
    switch (type) {
      case 'volatility_spike':
        return {
          currentVol: Math.random() * 50 + 20,
          avgVol: Math.random() * 30 + 15,
          percentIncrease: Math.random() * 100 + 50
        };
      case 'volume_surge':
        return {
          currentVolume: Math.floor(Math.random() * 50000000) + 10000000,
          avgVolume: Math.floor(Math.random() * 20000000) + 5000000,
          volumeRatio: Math.random() * 5 + 2
        };
      case 'earnings_beat':
        return {
          reported: (Math.random() * 2 + 1).toFixed(2),
          expected: (Math.random() * 1.5 + 0.8).toFixed(2),
          surprise: (Math.random() * 20 + 5).toFixed(1) + '%'
        };
      default:
        return {
          strength: Math.random(),
          duration: Math.floor(Math.random() * 24) + 1
        };
    }
  }

  private async processSignal(signal: ProcessedSignal) {
    // Store in Oracle's internal array
    this.signals.unshift(signal);
    
    // Keep only last 100 signals
    this.signals = this.signals.slice(0, 100);
    
    try {
      // Store in Supabase oracle_signals table
      const { supabase } = await import('../integrations/supabase/client');
      
      // Get current user to determine workspace
      const { data: { user } } = await supabase.auth.getUser();
      
      // Skip database operations for test accounts to prevent RLS errors
      if (!user || 
          user.id === '00000000-0000-0000-0000-000000000000' || 
          user.id === '00000000-0000-0000-0000-000000000002') {
        // Store in memory only for test accounts
        return;
      }

      // Get user's workspace - use maybeSingle to avoid 406 errors
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      let workspace_id: string;
      
      if (!workspace) {
        // Create default workspace for user if none exists
        const { data: newWorkspace } = await supabase
          .from('workspaces')
          .insert({
            name: `${user.email}'s Workspace`,
            owner_id: user.id,
            wtype: 'personal'
          })
          .select()
          .single();
          
        if (newWorkspace) {
          await supabase.from('workspace_members').insert({
            workspace_id: newWorkspace.id,
            user_id: user.id,
            role: 'owner'
          });
          workspace_id = newWorkspace.id;
        } else {
          return;
        }
      } else {
        workspace_id = workspace.workspace_id;
      }

      const { error } = await supabase.from('oracle_signals').insert({
        workspace_id,
        signal_type: signal.type,
        symbol: signal.symbol,
        direction: signal.direction === 'bullish' ? 1 : signal.direction === 'bearish' ? -1 : 0,
        strength: signal.confidence,
        summary: signal.signal,
        source: signal.sources?.[0] || 'oracle'
      });
      
      if (error) {
        console.warn('Failed to store signal in database:', error);
      }
    } catch (dbError) {
      console.warn('Database storage failed for signal:', dbError);
    }
    
    // Log to Recorder
    recorder.recordOracleSignal(signal);
    
    // Emit event for real-time updates
    eventBus.emit('oracle.signal.created', signal);
    
    logService.log('info', 'Oracle signal processed', {
      id: signal.id,
      type: signal.type,
      severity: signal.severity,
      symbol: signal.symbol
    });
  }

  private updateSectorHeatmap() {
    Object.keys(this.sectorHeatmap).forEach(sector => {
      // Simulate small random changes
      const data = this.sectorHeatmap[sector];
      data.performance += (Math.random() - 0.5) * 0.5; // ±0.25%
      data.volume = Math.max(0.1, data.volume + (Math.random() - 0.5) * 0.2);
      data.volatility = Math.max(0.05, Math.min(1.0, data.volatility + (Math.random() - 0.5) * 0.1));
      data.signals = this.signals.filter(s => s.sector === sector).length;
      data.lastUpdated = new Date();
    });
  }

  private checkForAlerts() {
    // Check for critical signals that warrant alerts
    const criticalSignals = this.signals.filter(s => 
      s.severity === 'critical' && 
      s.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
    );

    criticalSignals.forEach(signal => {
      if (!this.alerts.find(a => a.relatedSignals.includes(signal.id))) {
        this.generateAlert(signal);
      }
    });

    // Check sector-wide issues
    Object.entries(this.sectorHeatmap).forEach(([sector, data]) => {
      if (data.performance < -3 || data.volatility > 0.8) {
        this.generateSectorAlert(sector, data);
      }
    });
  }

  private generateAlert(signal: ProcessedSignal) {
    const alert: OracleAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.mapSignalToAlertType(signal.type),
      title: `Critical Signal: ${signal.signal}`,
      message: signal.description,
      severity: signal.severity,
      affectedSymbols: signal.symbol ? [signal.symbol] : [],
      affectedSectors: signal.sector ? [signal.sector] : [],
      timestamp: new Date(),
      actionRequired: signal.severity === 'critical',
      relatedSignals: [signal.id]
    };

    this.alerts.unshift(alert);
    this.alerts = this.alerts.slice(0, 50); // Keep last 50 alerts

    // Log to Recorder
    recorder.recordOracleAlert(alert);

    // Emit event
    eventBus.emit('oracle.alert', alert);

    logService.log('warn', 'Oracle alert generated', {
      id: alert.id,
      type: alert.type,
      severity: alert.severity
    });
  }

  private generateSectorAlert(sector: string, data: any) {
    // Prevent duplicate alerts for same sector within 1 hour
    const recentSectorAlert = this.alerts.find(a => 
      a.affectedSectors.includes(sector) && 
      a.timestamp.getTime() > Date.now() - 3600000
    );

    if (recentSectorAlert) return;

    const alert: OracleAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'sector_crash',
      title: `${sector} Sector Alert`,
      message: `${sector} showing signs of stress: ${data.performance.toFixed(2)}% performance, ${(data.volatility * 100).toFixed(1)}% volatility`,
      severity: data.performance < -5 ? 'critical' : 'high',
      affectedSymbols: [],
      affectedSectors: [sector],
      timestamp: new Date(),
      actionRequired: data.performance < -5,
      relatedSignals: this.signals.filter(s => s.sector === sector).map(s => s.id)
    };

    this.alerts.unshift(alert);
    this.alerts = this.alerts.slice(0, 50);

    recorder.recordOracleAlert(alert);
    eventBus.emit('oracle.alert', alert);

    logService.log('warn', 'Oracle sector alert generated', {
      sector,
      performance: data.performance,
      volatility: data.volatility
    });
  }

  private mapSignalToAlertType(signalType: ProcessedSignal['type']): OracleAlert['type'] {
    switch (signalType) {
      case 'volatility_spike':
        return 'volatility_spike';
      case 'earnings_beat':
        return 'earnings_surprise';
      case 'volume_surge':
      case 'options_flow':
        return 'unusual_activity';
      default:
        return 'risk_warning';
    }
  }

  private processExternalFeed(feed: MarketFeed) {
    logService.log('info', 'Processing external feed', {
      source: feed.source,
      type: feed.dataType,
      symbol: feed.symbol
    });

    // Process through Repository for cleaning
    // This would be implemented with actual feed processing logic
  }

  private processMarketContext(data: any) {
    // Analyze broker snapshot for market context
    logService.log('debug', 'Processing market context from broker snapshot');
  }

  private adjustSignalsForPortfolio(portfolioData: any) {
    // Adjust signal relevance based on current portfolio
    logService.log('debug', 'Adjusting signals for portfolio context');
  }

  // Public API methods
  getSignals(limit = 20): ProcessedSignal[] {
    // Return in-memory signals synchronously for now
    // Async database fetching can be handled separately via hooks/components
    return this.signals.slice(0, limit);
  }

  async getSignalsFromDb(limit = 20): Promise<ProcessedSignal[]> {
    try {
      // Get signals from database
      const { supabase } = await import('../integrations/supabase/client');
      
      // Get current user to determine workspace
      const { data: { user } } = await supabase.auth.getUser();
      
      // Skip database operations for test accounts to prevent RLS errors  
      if (!user || 
          user.id === '00000000-0000-0000-0000-000000000000' || 
          user.id === '00000000-0000-0000-0000-000000000002') {
        // Return in-memory signals only for test accounts
        return this.signals.slice(0, limit);
      }

      // Get user's workspace - use maybeSingle to avoid 406 errors
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!workspace) {
        return this.signals.slice(0, limit);
      }

      const { data, error } = await supabase
        .from('oracle_signals')
        .select('*')
        .eq('workspace_id', workspace.workspace_id)
        .order('ts', { ascending: false })
        .limit(limit);

      if (!error && data) {
        // Convert database format to ProcessedSignal format
        return data.map(record => ({
          id: record.id,
          type: record.signal_type as any,
          symbol: record.symbol,
          sector: 'Technology', // Default fallback
          severity: 'medium' as any,
          direction: record.direction === 1 ? 'bullish' : record.direction === -1 ? 'bearish' : 'neutral',
          confidence: record.strength || 0.7,
          signal: record.summary || '',
          description: record.summary || '',
          data: {},
          timestamp: new Date(record.ts),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          sources: [record.source || 'oracle']
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch signals from database:', error);
    }
    
    // Fallback to in-memory signals
    return this.signals.slice(0, limit);
  }

  getAlerts(limit = 10): OracleAlert[] {
    return this.alerts.slice(0, limit);
  }

  getSectorHeatmap(): SectorHeatmap {
    return { ...this.sectorHeatmap };
  }

  getTopSignals(limit = 3): ProcessedSignal[] {
    return this.signals
      .filter(s => s.severity === 'high' || s.severity === 'critical')
      .slice(0, limit);
  }

  getContextForSymbol(symbol: string): OracleContext {
    const symbolSignals = this.signals.filter(s => s.symbol === symbol).slice(0, 5);
    
    return {
      symbol,
      recentSignals: symbolSignals,
      marketSummary: this.generateMarketSummary(),
      keyFactors: this.getKeyFactors(symbol),
      volatilityLevel: this.calculateVolatilityLevel(symbol),
      timestamp: new Date()
    };
  }

  getContextForAnalyst(): OracleContext {
    return {
      recentSignals: this.getTopSignals(),
      marketSummary: this.generateMarketSummary(),
      keyFactors: this.getMarketKeyFactors(),
      volatilityLevel: this.calculateMarketVolatilityLevel(),
      timestamp: new Date()
    };
  }

  private generateMarketSummary(): string {
    const avgPerformance = Object.values(this.sectorHeatmap)
      .reduce((sum, sector) => sum + sector.performance, 0) / Object.keys(this.sectorHeatmap).length;
    
    const trend = avgPerformance > 1 ? 'bullish' : avgPerformance < -1 ? 'bearish' : 'neutral';
    
    return `Market showing ${trend} sentiment with ${avgPerformance.toFixed(2)}% average sector performance. ${this.signals.length} active signals detected.`;
  }

  private getKeyFactors(symbol: string): string[] {
    const symbolSignals = this.signals.filter(s => s.symbol === symbol);
    return symbolSignals.map(s => s.signal).slice(0, 3);
  }

  private getMarketKeyFactors(): string[] {
    const topSectors = Object.entries(this.sectorHeatmap)
      .sort(([,a], [,b]) => Math.abs(b.performance) - Math.abs(a.performance))
      .slice(0, 3)
      .map(([sector, data]) => `${sector}: ${data.performance.toFixed(1)}%`);
    
    return topSectors;
  }

  private calculateVolatilityLevel(symbol: string): 'low' | 'medium' | 'high' {
    const volatilitySignals = this.signals.filter(s => 
      s.symbol === symbol && s.type === 'volatility_spike'
    );
    
    if (volatilitySignals.length > 2) return 'high';
    if (volatilitySignals.length > 0) return 'medium';
    return 'low';
  }

  private calculateMarketVolatilityLevel(): 'low' | 'medium' | 'high' {
    const avgVolatility = Object.values(this.sectorHeatmap)
      .reduce((sum, sector) => sum + sector.volatility, 0) / Object.keys(this.sectorHeatmap).length;
    
    if (avgVolatility > 0.6) return 'high';
    if (avgVolatility > 0.3) return 'medium';
    return 'low';
  }

  getLastRefresh(): Date {
    return this.lastRefresh;
  }

  isOracleActive(): boolean {
    return this.isActive;
  }

  setActive(active: boolean) {
    this.isActive = active;
    logService.log('info', `Oracle ${active ? 'activated' : 'deactivated'}`);
  }
}

export const oracle = new OracleService();
