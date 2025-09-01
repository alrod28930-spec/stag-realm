// BID Service - Business Intelligence Database (single source of truth)

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { calculateRiskState } from '@/utils/formulas';
import { EVENT_TOPICS } from '@/utils/constants';

export interface BIDPosition {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  side: 'long' | 'short';
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocation: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdated: Date;
  beta: number;
  volatility: number;
  sector: string;
}

export interface BIDPortfolioSummary {
  totalEquity: number;
  availableCash: number;
  totalPositionValue: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: BIDPosition[];
  positionCount: number;
  lastUpdated: Date;
  dataQuality: 'excellent' | 'good' | 'poor' | 'stale';
  portfolioValue: number;
  exposure_count: number;
}

export interface BIDRiskMetrics {
  portfolioValue: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  betaToMarket: number;
  concentrationRisk: number;
  largestPosition: string;
  largestPositionPercent: number;
  sectorExposures: Record<string, number>;
  dailyDrawdown: number;
  weeklyDrawdown: number;
  currentDrawdown: number;
  risk_state: number;
  last_updated: Date;
}

export interface BIDAlert {
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
  acknowledged: boolean;
  createdAt: Date;
}

export interface OracleSignal {
  id: string;
  symbol: string;
  signal_type: 'vol_spike' | 'earnings_window' | 'momentum' | 'news_sentiment';
  strength: number; // 0-1
  direction: 'bull' | 'bear' | 'neutral';
  source: string;
  timestamp: Date;
  summary: string;
}

export interface SearchResult {
  id: string;
  query_id: string;
  symbol: string;
  relevance_score: number; // 0-1
  features_json: any;
  timestamp: Date;
}

export interface Recommendation {
  symbol: string;
  reason_bullets: string[];
  score: number;
  last_update_ts: Date;
  related_event_ids: string[];
  action_suggestion?: 'watch' | 'research' | 'consider_entry' | 'avoid';
  risk_level: 'low' | 'medium' | 'high';
  time_horizon: '1d' | '1w' | '1m';
}

class BIDService {
  private portfolioSummary: BIDPortfolioSummary | null = null;
  private riskMetrics: BIDRiskMetrics | null = null;
  private alerts: Map<string, BIDAlert> = new Map();
  private oracleSignals: Map<string, OracleSignal> = new Map();
  private searchResults: Map<string, SearchResult[]> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private rollingPnL: number[] = []; // Last 30 days P&L
  private sectorExposures: Record<string, number> = {};
  private lastSnapshot: Date = new Date();

  constructor() {
    this.initializeEventListeners();
    this.startPeriodicUpdates();
    this.initializeMockData();
  }

  private initializeEventListeners() {
    // Portfolio snapshots from Repository
    eventBus.on('repository.snapshot_cleaned', (snapshot: any) => {
      this.updatePortfolioFromSnapshot(snapshot);
    });

    // Market data updates
    eventBus.on(EVENT_TOPICS.MARKET_DATA_RECEIVED, (data: any) => {
      this.updateMarketPrices(data);
    });

    // Oracle signals
    eventBus.on(EVENT_TOPICS.ORACLE_SIGNAL_CREATED, (signal: OracleSignal) => {
      this.storeOracleSignal(signal);
    });

    // Risk alerts
    eventBus.on(EVENT_TOPICS.ALERT_CREATED, (alert: BIDAlert) => {
      this.storeAlert(alert);
    });

    // Search results
    eventBus.on('search.completed', (data: any) => {
      this.storeSearchResults(data);
    });

    // Recommendations
    eventBus.on('recommendations.generated', (recommendations: Recommendation[]) => {
      this.storeRecommendations(recommendations);
    });
  }

  private startPeriodicUpdates() {
    // Update risk metrics every 30 seconds
    setInterval(() => {
      this.updateRiskMetrics();
    }, 30000);

    // Update portfolio every minute
    setInterval(() => {
      this.refreshPortfolio();
    }, 60000);

    // Clean stale data every 5 minutes
    setInterval(() => {
      this.cleanStaleData();
    }, 5 * 60000);
  }

  private initializeMockData() {
    // Initialize with mock portfolio data
    this.portfolioSummary = {
      totalEquity: 50000,
      availableCash: 5000,
      totalPositionValue: 45000,
      totalUnrealizedPnL: 2500,
      totalUnrealizedPnLPercent: 5.88,
      dayChange: 850,
      dayChangePercent: 1.73,
      positions: this.createMockPositions(),
      positionCount: 5,
      lastUpdated: new Date(),
      dataQuality: 'good',
      portfolioValue: 50000,
      exposure_count: 5
    };

    this.sectorExposures = {
      'Technology': 35.2,
      'Healthcare': 22.1,
      'Finance': 18.5,
      'Consumer': 15.8,
      'Energy': 8.4
    };
  }

  private createMockPositions(): BIDPosition[] {
    return [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 50,
        averagePrice: 150.25,
        currentPrice: 165.80,
        marketValue: 8290,
        side: 'long',
        unrealizedPnL: 777.50,
        unrealizedPnLPercent: 10.35,
        allocation: 16.58,
        dayChange: 83.00,
        dayChangePercent: 1.01,
        lastUpdated: new Date(),
        beta: 1.2,
        volatility: 0.28,
        sector: 'Technology'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 30,
        averagePrice: 280.15,
        currentPrice: 295.45,
        marketValue: 8863.50,
        side: 'long',
        unrealizedPnL: 459.00,
        unrealizedPnLPercent: 5.47,
        allocation: 17.73,
        dayChange: 118.35,
        dayChangePercent: 1.35,
        lastUpdated: new Date(),
        beta: 0.9,
        volatility: 0.24,
        sector: 'Technology'
      },
      {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        quantity: 60,
        averagePrice: 160.20,
        currentPrice: 168.75,
        marketValue: 10125,
        side: 'long',
        unrealizedPnL: 513.00,
        unrealizedPnLPercent: 5.34,
        allocation: 20.25,
        dayChange: 101.25,
        dayChangePercent: 1.01,
        lastUpdated: new Date(),
        beta: 0.7,
        volatility: 0.18,
        sector: 'Healthcare'
      },
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        quantity: 40,
        averagePrice: 140.85,
        currentPrice: 152.30,
        marketValue: 6092,
        side: 'long',
        unrealizedPnL: 458.00,
        unrealizedPnLPercent: 8.13,
        allocation: 12.18,
        dayChange: 91.40,
        dayChangePercent: 1.52,
        lastUpdated: new Date(),
        beta: 1.1,
        volatility: 0.32,
        sector: 'Finance'
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        quantity: 15,
        averagePrice: 125.60,
        currentPrice: 142.85,
        marketValue: 2142.75,
        side: 'long',
        unrealizedPnL: 258.75,
        unrealizedPnLPercent: 13.73,
        allocation: 4.29,
        dayChange: 21.43,
        dayChangePercent: 1.01,
        lastUpdated: new Date(),
        beta: 1.3,
        volatility: 0.35,
        sector: 'Consumer'
      }
    ];
  }

  // Portfolio Management
  private updatePortfolioFromSnapshot(snapshot: any): void {
    try {
      if (!snapshot.positions) return;

      const positions: BIDPosition[] = snapshot.positions.map((pos: any) => ({
        symbol: pos.symbol,
        name: pos.name || pos.symbol,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        side: pos.side,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercent: (pos.unrealizedPnL / (pos.averagePrice * pos.quantity)) * 100,
        allocation: (pos.marketValue / snapshot.equity) * 100,
        dayChange: pos.dayChange || 0,
        dayChangePercent: pos.dayChangePercent || 0,
        lastUpdated: new Date(),
        beta: pos.beta || 1.0,
        volatility: pos.volatility || 0.2,
        sector: this.getSymbolSector(pos.symbol)
      }));

      this.portfolioSummary = {
        totalEquity: snapshot.equity,
        availableCash: snapshot.cash,
        totalPositionValue: snapshot.equity - snapshot.cash,
        totalUnrealizedPnL: positions.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        totalUnrealizedPnLPercent: ((positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) / snapshot.equity) * 100),
        dayChange: snapshot.dayChange || 0,
        dayChangePercent: snapshot.dayChangePercent || 0,
        positions,
        positionCount: positions.length,
        lastUpdated: new Date(),
        dataQuality: snapshot.validated ? 'good' : 'poor',
        portfolioValue: snapshot.equity,
        exposure_count: positions.length
      };

      this.updateSectorExposures();
      this.updateRollingPnL();
      this.lastSnapshot = new Date();

      // Emit portfolio updated event
      eventBus.emit(EVENT_TOPICS.PORTFOLIO_UPDATED, {
        summary: this.portfolioSummary,
        positions: positions
      });

      logService.log('info', 'Portfolio updated from snapshot', {
        totalEquity: this.portfolioSummary.totalEquity,
        positionCount: positions.length
      });

    } catch (error) {
      logService.log('error', 'Failed to update portfolio from snapshot', { error });
    }
  }

  private updateMarketPrices(data: any): void {
    if (!this.portfolioSummary || !data.snapshot) return;

    const { symbol, snapshot } = data;
    const position = this.portfolioSummary.positions.find(p => p.symbol === symbol);
    
    if (position) {
      const oldPrice = position.currentPrice;
      position.currentPrice = snapshot.price;
      position.marketValue = position.quantity * snapshot.price;
      position.unrealizedPnL = (snapshot.price - position.averagePrice) * position.quantity;
      position.unrealizedPnLPercent = (position.unrealizedPnL / (position.averagePrice * position.quantity)) * 100;
      position.dayChange = (snapshot.price - oldPrice) * position.quantity;
      position.dayChangePercent = ((snapshot.price - oldPrice) / oldPrice) * 100;
      position.lastUpdated = new Date();

      // Recalculate portfolio totals
      this.recalculatePortfolioTotals();
    }
  }

  private recalculatePortfolioTotals(): void {
    if (!this.portfolioSummary) return;

    const totalPositionValue = this.portfolioSummary.positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPnL = this.portfolioSummary.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalDayChange = this.portfolioSummary.positions.reduce((sum, p) => sum + p.dayChange, 0);

    this.portfolioSummary.totalPositionValue = totalPositionValue;
    this.portfolioSummary.totalEquity = totalPositionValue + this.portfolioSummary.availableCash;
    this.portfolioSummary.totalUnrealizedPnL = totalUnrealizedPnL;
    this.portfolioSummary.totalUnrealizedPnLPercent = (totalUnrealizedPnL / this.portfolioSummary.totalEquity) * 100;
    this.portfolioSummary.dayChange = totalDayChange;
    this.portfolioSummary.dayChangePercent = (totalDayChange / (this.portfolioSummary.totalEquity - totalDayChange)) * 100;
    this.portfolioSummary.lastUpdated = new Date();

    // Update allocations
    this.portfolioSummary.positions.forEach(position => {
      position.allocation = (position.marketValue / this.portfolioSummary!.totalEquity) * 100;
    });
  }

  private updateSectorExposures(): void {
    if (!this.portfolioSummary) return;

    this.sectorExposures = {};
    
    this.portfolioSummary.positions.forEach(position => {
      const sector = position.sector;
      this.sectorExposures[sector] = (this.sectorExposures[sector] || 0) + position.allocation;
    });
  }

  private updateRollingPnL(): void {
    if (!this.portfolioSummary) return;

    this.rollingPnL.push(this.portfolioSummary.totalUnrealizedPnL);
    
    // Keep only last 30 days
    if (this.rollingPnL.length > 30) {
      this.rollingPnL = this.rollingPnL.slice(-30);
    }
  }

  private getSymbolSector(symbol: string): string {
    // Mock sector mapping - would use real data in production
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer',
      'TSLA': 'Consumer',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'JPM': 'Finance',
      'BAC': 'Finance',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };
    
    return sectorMap[symbol] || 'Other';
  }

  // Risk Metrics
  private updateRiskMetrics(): void {
    if (!this.portfolioSummary) return;

    const positions = this.portfolioSummary.positions;
    const portfolioValue = this.portfolioSummary.totalEquity;
    
    // Calculate concentration risk
    const largestPosition = positions.reduce((largest, pos) => 
      pos.allocation > largest.allocation ? pos : largest, positions[0] || { allocation: 0, symbol: 'N/A' }
    );

    // Calculate portfolio volatility (weighted average)
    const portfolioVolatility = positions.reduce((sum, pos) => 
      sum + (pos.allocation / 100) * pos.volatility, 0
    );

    // Calculate portfolio beta (weighted average)
    const portfolioBeta = positions.reduce((sum, pos) => 
      sum + (pos.allocation / 100) * pos.beta, 0
    );

    // Calculate drawdowns
    const currentEquity = portfolioValue;
    const highWaterMark = Math.max(...this.rollingPnL.map(pnl => currentEquity - pnl));
    const currentDrawdown = ((highWaterMark - currentEquity) / highWaterMark) * 100;
    
    // Calculate risk state using formula
    const riskComponents = {
      drawdown_norm: Math.abs(currentDrawdown) / 20, // Normalize to 20% max drawdown
      exposure_norm: (portfolioValue - this.portfolioSummary.availableCash) / portfolioValue,
      vol_spike_norm: Math.min(portfolioVolatility / 0.5, 1), // Normalize to 50% max vol
      liquidity_norm: 0.1, // Mock liquidity risk
      concentration_norm: largestPosition.allocation / 50 // Normalize to 50% max concentration
    };

    const riskState = calculateRiskState(riskComponents);

    this.riskMetrics = {
      portfolioValue,
      volatility: portfolioVolatility,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown(),
      betaToMarket: portfolioBeta,
      concentrationRisk: largestPosition.allocation,
      largestPosition: largestPosition.symbol,
      largestPositionPercent: largestPosition.allocation,
      sectorExposures: { ...this.sectorExposures },
      dailyDrawdown: this.calculateDailyDrawdown(),
      weeklyDrawdown: this.calculateWeeklyDrawdown(),
      currentDrawdown,
      risk_state: riskState,
      last_updated: new Date()
    };
  }

  private calculateSharpeRatio(): number {
    if (this.rollingPnL.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < this.rollingPnL.length; i++) {
      const dailyReturn = (this.rollingPnL[i] - this.rollingPnL[i-1]) / (this.portfolioSummary?.totalEquity || 1);
      returns.push(dailyReturn);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)); // Annualized
  }

  private calculateMaxDrawdown(): number {
    if (this.rollingPnL.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = this.rollingPnL[0];
    
    for (let i = 1; i < this.rollingPnL.length; i++) {
      if (this.rollingPnL[i] > peak) {
        peak = this.rollingPnL[i];
      }
      
      const drawdown = (peak - this.rollingPnL[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown * 100;
  }

  private calculateDailyDrawdown(): number {
    if (this.rollingPnL.length < 2) return 0;
    
    const today = this.rollingPnL[this.rollingPnL.length - 1];
    const yesterday = this.rollingPnL[this.rollingPnL.length - 2];
    
    return ((yesterday - today) / yesterday) * 100;
  }

  private calculateWeeklyDrawdown(): number {
    if (this.rollingPnL.length < 7) return 0;
    
    const thisWeek = this.rollingPnL[this.rollingPnL.length - 1];
    const lastWeek = this.rollingPnL[this.rollingPnL.length - 7];
    
    return ((lastWeek - thisWeek) / lastWeek) * 100;
  }

  // Data Storage
  private storeOracleSignal(signal: OracleSignal): void {
    this.oracleSignals.set(signal.id, signal);
    
    // Keep only last 1000 signals
    if (this.oracleSignals.size > 1000) {
      const oldest = Array.from(this.oracleSignals.keys())[0];
      this.oracleSignals.delete(oldest);
    }
  }

  private storeAlert(alert: BIDAlert): void {
    this.alerts.set(alert.id, alert);
    
    // Keep only last 500 alerts
    if (this.alerts.size > 500) {
      const oldest = Array.from(this.alerts.keys())[0];
      this.alerts.delete(oldest);
    }
  }

  private storeSearchResults(data: any): void {
    this.searchResults.set(data.queryId, data.results || []);
    
    // Keep only last 100 searches
    if (this.searchResults.size > 100) {
      const oldest = Array.from(this.searchResults.keys())[0];
      this.searchResults.delete(oldest);
    }
  }

  private storeRecommendations(recommendations: Recommendation[]): void {
    recommendations.forEach(rec => {
      this.recommendations.set(rec.symbol, rec);
    });
    
    // Keep only last 50 recommendations
    if (this.recommendations.size > 50) {
      const symbols = Array.from(this.recommendations.keys());
      const oldest = symbols.slice(0, symbols.length - 50);
      oldest.forEach(symbol => this.recommendations.delete(symbol));
    }
  }

  // Data Cleanup
  private cleanStaleData(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean stale Oracle signals
    Array.from(this.oracleSignals.entries()).forEach(([id, signal]) => {
      if (now - signal.timestamp.getTime() > staleThreshold) {
        this.oracleSignals.delete(id);
      }
    });
    
    // Clean stale alerts
    Array.from(this.alerts.entries()).forEach(([id, alert]) => {
      if (now - alert.createdAt.getTime() > staleThreshold && alert.acknowledged) {
        this.alerts.delete(id);
      }
    });
  }

  private refreshPortfolio(): void {
    // Emit refresh request
    eventBus.emit('bid.refresh_requested', {
      timestamp: new Date()
    });
  }

  // Public API
  public getPortfolioSummary(): BIDPortfolioSummary | null {
    return this.portfolioSummary;
  }

  public getRiskMetrics(): BIDRiskMetrics | null {
    return this.riskMetrics;
  }

  public getAlerts(limit = 20): BIDAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  public getOracleSignals(limit = 50): OracleSignal[] {
    return Array.from(this.oracleSignals.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getSearchResults(queryId: string): SearchResult[] {
    return this.searchResults.get(queryId) || [];
  }

  public getRecommendations(limit = 10): Recommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public getSectorExposures(): Record<string, number> {
    return { ...this.sectorExposures };
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      eventBus.emit('bid.alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  public getDataQuality(): 'excellent' | 'good' | 'poor' | 'stale' {
    if (!this.portfolioSummary) return 'stale';
    
    const ageMinutes = (Date.now() - this.lastSnapshot.getTime()) / (1000 * 60);
    
    if (ageMinutes > 10) return 'stale';
    if (ageMinutes > 5) return 'poor';
    if (ageMinutes > 2) return 'good';
    return 'excellent';
  }
}

// Export singleton instance
export const bidService = new BIDService();
