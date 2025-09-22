import { logService } from './logging';
import { eventBus } from './eventBus';
import { CleanedSnapshot, CleanedMarketData } from './repository';
import { dataCompression } from './dataCompression';
import { learningEngine } from './learningEngine';
import { storageManager } from './storageManager';
import { ProcessedSignal, OracleAlert } from '../types/oracle';
import { enhancedBID } from './bidEnhanced';

// BID - Business Intelligence Database (single source of truth)
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
  stopLossesActive: number;
  takeProfitsActive: number;
  lastCalculated: Date;
}

export interface BIDStrategySignal {
  id: string;
  strategyName: string;
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 0-1
  confidence: number; // 0-1
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  generatedAt: Date;
  expiresAt: Date;
}

export interface BIDAlert {
  id: string;
  type: 'risk' | 'opportunity' | 'technical' | 'fundamental' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  symbol?: string;
  data?: Record<string, any>;
  acknowledged: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface BIDMarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  vix: number;
  spyTrend: 'up' | 'down' | 'sideways';
  sectorRotation: Record<string, number>;
  fearGreedIndex: number;
  lastUpdated: Date;
}

// Main BID class
export class BID {
  private portfolio: BIDPortfolioSummary | null = null;
  private riskMetrics: BIDRiskMetrics | null = null;
  private strategySignals: BIDStrategySignal[] = [];
  private alerts: BIDAlert[] = [];
  private marketSentiment: BIDMarketSentiment | null = null;
  private featureFlags: Map<string, boolean> = new Map();
  private oracleSignals: ProcessedSignal[] = [];
  private oracleAlerts: OracleAlert[] = [];
  
  constructor() {
    // Initialize feature flags
    this.featureFlags.set('riskManagement', true);
    this.featureFlags.set('strategySignals', true);
    this.featureFlags.set('marketSentiment', true);
    this.featureFlags.set('alertSystem', true);
    
    // Listen for repository events
    eventBus.on('repository.snapshot_cleaned', (snapshot: CleanedSnapshot) => {
      this.updatePortfolioFromSnapshot(snapshot);
    });
    
    eventBus.on('repository.market_data_cleaned', (marketData: CleanedMarketData[]) => {
      this.updateMarketSentiment(marketData);
    });
  }

  // Update portfolio from cleaned repository snapshot
  private async updatePortfolioFromSnapshot(snapshot: CleanedSnapshot): Promise<void> {
    try {
      logService.log('info', 'Updating BID portfolio from snapshot', { id: snapshot.id });

      // Convert cleaned positions to BID positions
      const bidPositions: BIDPosition[] = snapshot.positions.map(pos => {
        const dayChange = pos.currentPrice * 0.02 * (Math.random() - 0.5); // Mock day change
        return {
          symbol: pos.symbol,
          name: this.getSymbolName(pos.symbol),
          quantity: pos.quantity,
          averagePrice: pos.averagePrice,
          currentPrice: pos.currentPrice,
          marketValue: pos.marketValue,
          side: pos.side,
          unrealizedPnL: pos.unrealizedPnL,
          unrealizedPnLPercent: (pos.unrealizedPnL / (pos.averagePrice * pos.quantity)) * 100,
          allocation: 0, // Will be calculated below
          dayChange,
          dayChangePercent: (dayChange / pos.currentPrice) * 100,
          lastUpdated: snapshot.timestamp
        };
      });

      // Calculate allocations
      const totalPositionValue = bidPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
      bidPositions.forEach(pos => {
        pos.allocation = totalPositionValue > 0 ? (pos.marketValue / (totalPositionValue + snapshot.cash)) * 100 : 0;
      });

      // Calculate portfolio summary
      const totalUnrealizedPnL = bidPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
      const totalDayChange = bidPositions.reduce((sum, pos) => sum + pos.dayChange * pos.quantity, 0);

      this.portfolio = {
        totalEquity: snapshot.equity,
        availableCash: snapshot.cash,
        totalPositionValue,
        totalUnrealizedPnL,
        totalUnrealizedPnLPercent: totalPositionValue > 0 ? (totalUnrealizedPnL / totalPositionValue) * 100 : 0,
        dayChange: totalDayChange,
        dayChangePercent: totalPositionValue > 0 ? (totalDayChange / totalPositionValue) * 100 : 0,
        positions: bidPositions,
        positionCount: bidPositions.length,
        lastUpdated: snapshot.timestamp,
        dataQuality: this.assessDataQuality(snapshot)
      };

      // Update risk metrics
      await this.calculateRiskMetrics();

      // Generate alerts based on new data
      await this.generateAlerts();

      eventBus.emit('bid.portfolio_updated', this.portfolio);
      logService.log('info', 'BID portfolio updated successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'BID update error';
      logService.log('error', 'Failed to update BID portfolio', { error: errorMessage });
    }
  }

  // Calculate risk metrics
  private async calculateRiskMetrics(): Promise<void> {
    if (!this.portfolio) return;

    try {
      const positions = this.portfolio.positions;
      let concentrationRisk = 0;
      let largestPosition = '';
      let largestPositionPercent = 0;

      // Find largest position for concentration risk
      positions.forEach(pos => {
        if (pos.allocation > largestPositionPercent) {
          largestPositionPercent = pos.allocation;
          largestPosition = pos.symbol;
        }
      });

      // Calculate concentration risk (sum of squares of allocations)
      concentrationRisk = positions.reduce((sum, pos) => {
        const weight = pos.allocation / 100;
        return sum + (weight * weight);
      }, 0);

      // Mock other risk metrics (in real implementation, these would be calculated from historical data)
      this.riskMetrics = {
        portfolioValue: this.portfolio.totalEquity,
        volatility: 0.15 + Math.random() * 0.1, // Mock 15-25% annualized volatility
        sharpeRatio: 0.8 + Math.random() * 0.4, // Mock 0.8-1.2 Sharpe ratio
        maxDrawdown: -(0.05 + Math.random() * 0.1), // Mock 5-15% max drawdown
        betaToMarket: 0.8 + Math.random() * 0.4, // Mock 0.8-1.2 beta
        concentrationRisk,
        largestPosition,
        largestPositionPercent,
        stopLossesActive: 0, // Would be calculated from active orders
        takeProfitsActive: 0, // Would be calculated from active orders
        lastCalculated: new Date()
      };

      eventBus.emit('bid.risk_metrics_updated', this.riskMetrics);

    } catch (error) {
      logService.log('error', 'Failed to calculate risk metrics', { error });
    }
  }

  // Generate alerts based on current data
  private async generateAlerts(): Promise<void> {
    if (!this.portfolio || !this.riskMetrics) return;

    const newAlerts: BIDAlert[] = [];

    // Risk-based alerts
    if (this.riskMetrics.concentrationRisk > 0.5) {
      newAlerts.push({
        id: `alert_${Date.now()}_concentration`,
        type: 'risk',
        severity: 'high',
        title: 'High Concentration Risk',
        message: `Portfolio is heavily concentrated in ${this.riskMetrics.largestPosition} (${this.riskMetrics.largestPositionPercent.toFixed(1)}%)`,
        symbol: this.riskMetrics.largestPosition,
        acknowledged: false,
        createdAt: new Date()
      });
    }

    // Position-based alerts
    this.portfolio.positions.forEach(pos => {
      if (pos.unrealizedPnLPercent < -10) {
        newAlerts.push({
          id: `alert_${Date.now()}_loss_${pos.symbol}`,
          type: 'risk',
          severity: 'medium',
          title: 'Large Unrealized Loss',
          message: `${pos.symbol} is down ${Math.abs(pos.unrealizedPnLPercent).toFixed(1)}%`,
          symbol: pos.symbol,
          acknowledged: false,
          createdAt: new Date()
        });
      }

      if (pos.unrealizedPnLPercent > 20) {
        newAlerts.push({
          id: `alert_${Date.now()}_gain_${pos.symbol}`,
          type: 'opportunity',
          severity: 'low',
          title: 'Large Unrealized Gain',
          message: `${pos.symbol} is up ${pos.unrealizedPnLPercent.toFixed(1)}% - consider taking profits`,
          symbol: pos.symbol,
          acknowledged: false,
          createdAt: new Date()
        });
      }
    });

    // Add new alerts
    this.alerts.unshift(...newAlerts);
    this.alerts = this.alerts.slice(0, 100); // Keep last 100 alerts

    if (newAlerts.length > 0) {
      eventBus.emit('bid.alerts_generated', newAlerts);
    }
  }

  // Public getters
  getPortfolio(): BIDPortfolioSummary | null {
    return this.portfolio;
  }

  getRiskMetrics(): BIDRiskMetrics | null {
    return this.riskMetrics;
  }

  getAlerts(unacknowledgedOnly = false): BIDAlert[] {
    return unacknowledgedOnly 
      ? this.alerts.filter(alert => !alert.acknowledged)
      : this.alerts;
  }

  getStrategySignals(symbol?: string): BIDStrategySignal[] {
    const signals = this.strategySignals.filter(signal => 
      new Date() < signal.expiresAt
    );
    
    return symbol 
      ? signals.filter(signal => signal.symbol === symbol.toUpperCase())
      : signals;
  }

  getMarketSentiment(): BIDMarketSentiment | null {
    return this.marketSentiment;
  }

  // Oracle signal management
  addOracleSignal(signal: ProcessedSignal): void {
    this.oracleSignals.unshift(signal);
    this.oracleSignals = this.oracleSignals.slice(0, 100); // Keep last 100 signals
    
    logService.log('debug', 'Oracle signal added to BID', {
      id: signal.id,
      type: signal.type,
      severity: signal.severity
    });

    // Emit update event
    eventBus.emit('bid.oracle_signal_added', signal);
  }

  addOracleAlert(alert: OracleAlert): void {
    this.oracleAlerts.unshift(alert);
    this.oracleAlerts = this.oracleAlerts.slice(0, 50); // Keep last 50 alerts
    
    logService.log('debug', 'Oracle alert added to BID', {
      id: alert.id,
      type: alert.type,
      severity: alert.severity
    });

    // Emit update event
    eventBus.emit('bid.oracle_alert_added', alert);
  }

  getOracleSignals(limit = 20): ProcessedSignal[] {
    return this.oracleSignals.slice(0, limit);
  }

  getOracleAlerts(limit = 10): OracleAlert[] {
    return this.oracleAlerts.slice(0, limit);
  }

  getOracleSignalsBySymbol(symbol: string, limit = 10): ProcessedSignal[] {
    return this.oracleSignals
      .filter(signal => signal.symbol === symbol)
      .slice(0, limit);
  }

  getOracleSignalsBySeverity(severity: ProcessedSignal['severity'], limit = 10): ProcessedSignal[] {
    return this.oracleSignals
      .filter(signal => signal.severity === severity)
      .slice(0, limit);
  }

  // Feature flag management
  isFeatureEnabled(feature: string): boolean {
    return this.featureFlags.get(feature) || false;
  }

  setFeatureFlag(feature: string, enabled: boolean): void {
    this.featureFlags.set(feature, enabled);
    eventBus.emit('bid.feature_flag_updated', { feature, enabled });
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      eventBus.emit('bid.alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  // Add strategy signal
  addStrategySignal(signal: Omit<BIDStrategySignal, 'id' | 'generatedAt'>): void {
    const fullSignal: BIDStrategySignal = {
      ...signal,
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date()
    };

    this.strategySignals.unshift(fullSignal);
    this.strategySignals = this.strategySignals.slice(0, 50); // Keep last 50 signals

    eventBus.emit('bid.strategy_signal_added', fullSignal);
  }

  // Helper methods
  private assessDataQuality(snapshot: CleanedSnapshot): 'excellent' | 'good' | 'poor' | 'stale' {
    if (!snapshot.validated) return 'poor';
    
    const age = Date.now() - snapshot.timestamp.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;
    
    if (age < fiveMinutes) return 'excellent';
    if (age < fifteenMinutes) return 'good';
    return 'stale';
  }

  private getSymbolName(symbol: string): string {
    // In a real implementation, this would lookup company names
    const names: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corp.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corp.',
      'AMZN': 'Amazon Inc.',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.'
    };
    return names[symbol] || symbol;
  }

  private updateMarketSentiment(marketData: CleanedMarketData[]): void {
    // Mock market sentiment calculation
    const vixData = marketData.find(d => d.symbol === 'VIX');
    const spyData = marketData.find(d => d.symbol === 'SPY');
    
    this.marketSentiment = {
      overall: Math.random() > 0.5 ? 'bullish' : 'bearish',
      confidence: 0.6 + Math.random() * 0.3,
      vix: vixData?.price || 18.5,
      spyTrend: 'up',
      sectorRotation: {
        'Technology': 0.15,
        'Healthcare': 0.12,
        'Finance': 0.08,
        'Consumer': 0.06
      },
      fearGreedIndex: 50 + Math.random() * 30,
      lastUpdated: new Date()
    };

    eventBus.emit('bid.market_sentiment_updated', this.marketSentiment);
  }
}

// Export singleton instance (maintaining backward compatibility)
export const bid = new BID();

// Enhanced BID is available as enhancedBID for new intelligent features
// The original bid instance is still used for basic data operations
// while enhancedBID provides the intelligent learning and adaptation layer