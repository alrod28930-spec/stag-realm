import { logService } from './logging';
import { eventBus } from './eventBus';
import { repository } from './repository';
import { bid } from './bid';
import { recorder } from './recorder';

// Oracle data structures
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
    this.startDataFeeds();
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
    // Simulate real-time data feeds
    setInterval(() => {
      if (this.isActive) {
        this.simulateMarketData();
      }
    }, 30000); // Update every 30 seconds

    // Initial data load
    this.simulateMarketData();
  }

  private simulateMarketData() {
    // Generate mock signals based on current market conditions
    const mockSignals = this.generateMockSignals();
    
    mockSignals.forEach(signal => {
      this.processSignal(signal);
    });

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
      const symbol = Math.random() > 0.3 ? symbols[Math.floor(Math.random() * symbols.length)] : undefined;
      const sector = Math.random() > 0.5 ? sectors[Math.floor(Math.random() * sectors.length)] : undefined;
      
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

  private processSignal(signal: ProcessedSignal) {
    // Store in Oracle's internal array
    this.signals.unshift(signal);
    
    // Keep only last 100 signals
    this.signals = this.signals.slice(0, 100);
    
    // Store in BID for consumption by other services
    bid.addOracleSignal(signal);
    
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
