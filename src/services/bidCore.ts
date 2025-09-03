// BID Core - Hot, Lean Truth Database with Minimal Schemas

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { EVENT_TOPICS } from '@/utils/constants';

// A) Market Primitives & Reference Data
export interface RefSymbol {
  symbol: string; // PK
  exchange: string;
  asset_class: 'equity' | 'etf' | 'fx' | 'crypto';
  cik?: string;
  figi?: string;
  sector: string;
  industry: string;
  free_float?: number;
  updated_ts: Date;
}

export interface Candle {
  symbol: string;
  tf: '1m' | '5m' | '15m' | '1h' | 'D1';
  ts: Date;
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  vwap?: number;
}

export interface Indicator {
  symbol: string;
  tf: '1m' | '5m' | '15m' | '1h' | 'D1';
  ts: Date;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi14?: number;
  macd?: number;
  atr14?: number;
  bb_up?: number;
  bb_dn?: number;
  vwap_sess?: number;
}

// B) Portfolio Truth & Risk
export interface PortfolioCurrent {
  equity: number;
  cash: number;
  updated_ts: Date;
}

export interface PositionCurrent {
  symbol: string;
  qty: number;
  avg_cost: number;
  mv: number; // market value
  unr_pnl: number; // unrealized P&L
  r_pnl: number; // realized P&L
  updated_ts: Date;
}

export interface RiskPortfolio {
  ts: Date;
  dd_pct: number; // drawdown percent
  beta: number;
  var_95: number; // Value at Risk 95%
  es_95: number; // Expected Shortfall 95%
  concentration_top: number; // top position %
  liquidity_score: number;
  risk_state: number;
}

export interface RiskPosition {
  symbol: string;
  ts: Date;
  beta_sym: number;
  adv_pct: number; // average daily volume %
  spread_est: number;
  stop_suggest?: number;
  tp_suggest?: number; // take profit
}

// C) Derived Analytics
export interface PerfPortfolioDaily {
  date: Date;
  ret_d: number; // daily return
  ret_cum: number; // cumulative return
  bench_ret_d: number; // benchmark daily return
  bench_diff: number; // difference from benchmark
}

export interface PerfPositionDaily {
  symbol: string;
  date: Date;
  ret_d: number;
  ret_cum: number;
}

// D) News, Macro & Geo-Political Intelligence
export interface MacroEvent {
  id: string;
  date: Date;
  type: string; // CPI, NFP, FOMC, etc.
  actual?: number;
  consensus?: number;
  surprise?: number;
  impact: 'bull' | 'bear' | 'neutral';
}

export interface GeoEvent {
  id: string;
  ts_start: Date;
  ts_end?: Date;
  region: string;
  type: string; // sanctions, elections, war, etc.
  severity: 1 | 2 | 3 | 4;
  affected_assets: string[]; // symbols/sectors
  impact_dir: 'bull' | 'bear' | 'neutral';
  confidence: number; // 0-1
}

// E) Recommendation & Search Index
export interface OracleSignal {
  id: string;
  symbol: string;
  signal_type: 'vol_spike' | 'earnings_window' | 'momentum' | 'news_sentiment';
  strength: number; // 0-1
  direction: 'bull' | 'bear' | 'neutral';
  source: string;
  ts: Date;
  summary: string;
}

export interface SearchQuery {
  id: string;
  owner_id: string;
  query_text: string;
  filters_json: string;
  notify: boolean;
  created_ts: Date;
  last_run_ts?: Date;
}

export interface SearchResult {
  id: string;
  query_id: string;
  symbol: string;
  relevance_score: number; // 0-1
  features_json: string;
  ts: Date;
}

export interface Recommendation {
  symbol: string;
  score: number;
  reason_bullets_json: string; // JSON array
  related_event_ids_json: string; // JSON array
  last_update_ts: Date;
}

class BIDCore {
  // Market Primitives
  private refSymbols: Map<string, RefSymbol> = new Map();
  private candles: Map<string, Candle[]> = new Map(); // symbol_tf -> candles
  private indicators: Map<string, Indicator[]> = new Map(); // symbol_tf -> indicators

  // Portfolio & Risk
  private portfolioCurrent: PortfolioCurrent | null = null;
  private positionsCurrent: Map<string, PositionCurrent> = new Map();
  private riskPortfolio: RiskPortfolio[] = [];
  private riskPositions: Map<string, RiskPosition[]> = new Map();

  // Performance
  private perfPortfolioDaily: PerfPortfolioDaily[] = [];
  private perfPositionsDaily: Map<string, PerfPositionDaily[]> = new Map();

  // News, Macro & Geo
  private macroEvents: Map<string, MacroEvent> = new Map();
  private geoEvents: Map<string, GeoEvent> = new Map();

  // Search & Recommendations
  private oracleSignals: Map<string, OracleSignal> = new Map();
  private searchQueries: Map<string, SearchQuery> = new Map();
  private searchResults: Map<string, SearchResult[]> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();

  // Data retention limits (rolling windows)
  private readonly CANDLE_RETENTION = {
    '1m': 90, // 90 days
    '5m': 90,
    '15m': 90,
    '1h': 180,
    'D1': 730 // 2 years
  };

  private readonly INDICATOR_RETENTION = 90; // 90 days
  private readonly NEWS_RETENTION = 90; // 90 days
  private readonly PORTFOLIO_RETENTION = 730; // 2 years

  constructor() {
    this.initializeEventListeners();
    this.initializeSeedData();
    this.startMaintenanceTasks();
  }

  private initializeEventListeners() {
    // Repository feeds
    eventBus.on('repository.candle_processed', (candle: Candle) => {
      this.storeCandle(candle);
    });

    eventBus.on('repository.symbol_processed', (symbol: RefSymbol) => {
      this.storeRefSymbol(symbol);
    });

    // Portfolio updates
    eventBus.on('repository.portfolio_processed', (data: any) => {
      this.updatePortfolio(data);
    });

    // Oracle signals
    eventBus.on(EVENT_TOPICS.ORACLE_SIGNAL_CREATED, (signal: OracleSignal) => {
      this.storeOracleSignal(signal);
    });

    // Search queries
    eventBus.on('search.query_saved', (query: SearchQuery) => {
      this.storeSearchQuery(query);
    });

    // Macro/Geo events
    eventBus.on('macro.event_processed', (event: MacroEvent) => {
      this.storeMacroEvent(event);
    });

    eventBus.on('geo.event_processed', (event: GeoEvent) => {
      this.storeGeoEvent(event);
    });
  }

  private startMaintenanceTasks() {
    const { serviceManager } = require('./serviceManager');
    
    // Register this service
    serviceManager.registerService('bidCore', this, () => this.cleanup());
    
    // Calculate indicators every 5 minutes
    serviceManager.createInterval('bidCore', () => {
      this.updateIndicators();
    }, 5 * 60 * 1000);

    // Update risk metrics every minute
    serviceManager.createInterval('bidCore', () => {
      this.updateRiskMetrics();
    }, 60 * 1000);

    // Clean old data every hour
    serviceManager.createInterval('bidCore', () => {
      this.performMaintenance();
    }, 60 * 60 * 1000);

    // Update performance daily
    serviceManager.createInterval('bidCore', () => {
      this.updatePerformanceMetrics();
    }, 24 * 60 * 60 * 1000);
    
    serviceManager.startService('bidCore');
  }

  private cleanup(): void {
    logService.log('info', 'BID Core cleanup completed');
  }

  // A) Market Primitives Storage
  private storeRefSymbol(symbol: RefSymbol): void {
    this.refSymbols.set(symbol.symbol, symbol);
    logService.log('debug', 'Symbol stored in BID', { symbol: symbol.symbol });
  }

  private storeCandle(candle: Candle): void {
    const key = `${candle.symbol}_${candle.tf}`;
    let candles = this.candles.get(key) || [];
    
    // Check for existing candle at same timestamp
    const existingIndex = candles.findIndex(c => c.ts.getTime() === candle.ts.getTime());
    if (existingIndex >= 0) {
      candles[existingIndex] = candle; // Update existing
    } else {
      candles.push(candle);
      candles.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    }
    
    // Apply retention limits
    const retentionDays = this.CANDLE_RETENTION[candle.tf];
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    candles = candles.filter(c => c.ts >= cutoffDate);
    
    this.candles.set(key, candles);
    
    // Emit event for downstream processing
    eventBus.emit('bid.candle_stored', candle);
  }

  private updateIndicators(): void {
    // Calculate indicators for all symbols with recent candles
    this.candles.forEach((candles, key) => {
      if (candles.length < 20) return; // Need minimum data
      
      const [symbol, tf] = key.split('_');
      const latest = candles[candles.length - 1];
      
      const indicator: Indicator = {
        symbol,
        tf: tf as any,
        ts: latest.ts,
        ma20: this.calculateMA(candles, 20),
        ma50: this.calculateMA(candles, 50),
        ma200: this.calculateMA(candles, 200),
        rsi14: this.calculateRSI(candles, 14),
        macd: this.calculateMACD(candles),
        atr14: this.calculateATR(candles, 14),
        bb_up: this.calculateBollingerUpper(candles, 20, 2),
        bb_dn: this.calculateBollingerLower(candles, 20, 2),
        vwap_sess: this.calculateVWAP(candles)
      };
      
      this.storeIndicator(indicator);
    });
  }

  private storeIndicator(indicator: Indicator): void {
    const key = `${indicator.symbol}_${indicator.tf}`;
    let indicators = this.indicators.get(key) || [];
    
    // Update or add latest indicator
    const existingIndex = indicators.findIndex(i => i.ts.getTime() === indicator.ts.getTime());
    if (existingIndex >= 0) {
      indicators[existingIndex] = indicator;
    } else {
      indicators.push(indicator);
      indicators.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    }
    
    // Apply retention
    const cutoffDate = new Date(Date.now() - this.INDICATOR_RETENTION * 24 * 60 * 60 * 1000);
    indicators = indicators.filter(i => i.ts >= cutoffDate);
    
    this.indicators.set(key, indicators);
  }

  // B) Portfolio & Risk Storage
  private updatePortfolio(data: any): void {
    if (data.portfolio) {
      this.portfolioCurrent = {
        equity: data.portfolio.equity,
        cash: data.portfolio.cash,
        updated_ts: new Date()
      };
    }
    
    if (data.positions) {
      this.positionsCurrent.clear();
      data.positions.forEach((pos: any) => {
        this.positionsCurrent.set(pos.symbol, {
          symbol: pos.symbol,
          qty: pos.quantity,
          avg_cost: pos.averagePrice,
          mv: pos.marketValue,
          unr_pnl: pos.unrealizedPnL,
          r_pnl: pos.realizedPnL || 0,
          updated_ts: new Date()
        });
      });
    }
    
    eventBus.emit('bid.portfolio_updated', {
      portfolio: this.portfolioCurrent,
      positions: Array.from(this.positionsCurrent.values())
    });
  }

  private updateRiskMetrics(): void {
    if (!this.portfolioCurrent || this.positionsCurrent.size === 0) return;
    
    const positions = Array.from(this.positionsCurrent.values());
    const totalValue = this.portfolioCurrent.equity;
    
    // Calculate concentration risk
    const topPosition = positions.reduce((max, pos) => 
      (pos.mv / totalValue) > (max.mv / totalValue) ? pos : max, positions[0]
    );
    const concentrationTop = (topPosition.mv / totalValue) * 100;
    
    // Calculate portfolio beta (simplified)
    const portfolioBeta = positions.reduce((sum, pos) => {
      const weight = pos.mv / totalValue;
      const symbolBeta = this.getSymbolBeta(pos.symbol);
      return sum + (weight * symbolBeta);
    }, 0);
    
    // Calculate drawdown (simplified - would use historical equity curve)
    const drawdown = this.calculateDrawdown();
    
    const riskMetric: RiskPortfolio = {
      ts: new Date(),
      dd_pct: drawdown,
      beta: portfolioBeta,
      var_95: this.calculateVaR95(positions),
      es_95: this.calculateES95(positions),
      concentration_top: concentrationTop,
      liquidity_score: this.calculateLiquidityScore(positions),
      risk_state: this.calculateRiskState(drawdown, concentrationTop, portfolioBeta)
    };
    
    this.riskPortfolio.push(riskMetric);
    
    // Keep only recent risk metrics
    const cutoffDate = new Date(Date.now() - this.PORTFOLIO_RETENTION * 24 * 60 * 60 * 1000);
    this.riskPortfolio = this.riskPortfolio.filter(r => r.ts >= cutoffDate);
    
    // Update position-level risk
    this.updatePositionRisk(positions);
  }

  private updatePositionRisk(positions: PositionCurrent[]): void {
    positions.forEach(pos => {
      const riskPos: RiskPosition = {
        symbol: pos.symbol,
        ts: new Date(),
        beta_sym: this.getSymbolBeta(pos.symbol),
        adv_pct: this.calculateADVPercent(pos.symbol, pos.mv),
        spread_est: this.estimateSpread(pos.symbol),
        stop_suggest: pos.avg_cost * 0.95, // 5% stop loss
        tp_suggest: pos.avg_cost * 1.10 // 10% take profit
      };
      
      let posRisks = this.riskPositions.get(pos.symbol) || [];
      posRisks.push(riskPos);
      
      // Keep only recent data
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      posRisks = posRisks.filter(r => r.ts >= cutoffDate);
      
      this.riskPositions.set(pos.symbol, posRisks);
    });
  }

  // C) Performance Metrics
  private updatePerformanceMetrics(): void {
    if (!this.portfolioCurrent) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Portfolio daily performance
    const yesterdayEquity = this.getYesterdayEquity();
    const dailyReturn = yesterdayEquity > 0 ? 
      (this.portfolioCurrent.equity - yesterdayEquity) / yesterdayEquity : 0;
    
    const benchmarkReturn = 0.001; // Mock SPY daily return
    
    const perfDaily: PerfPortfolioDaily = {
      date: today,
      ret_d: dailyReturn,
      ret_cum: this.calculateCumulativeReturn(),
      bench_ret_d: benchmarkReturn,
      bench_diff: dailyReturn - benchmarkReturn
    };
    
    this.perfPortfolioDaily.push(perfDaily);
    
    // Position daily performance
    this.positionsCurrent.forEach(pos => {
      const posPerf: PerfPositionDaily = {
        symbol: pos.symbol,
        date: today,
        ret_d: pos.unr_pnl / (pos.avg_cost * pos.qty),
        ret_cum: this.calculatePositionCumulativeReturn(pos.symbol)
      };
      
      let posPerfHistory = this.perfPositionsDaily.get(pos.symbol) || [];
      posPerfHistory.push(posPerf);
      
      // Keep only recent data
      const cutoffDate = new Date(Date.now() - this.PORTFOLIO_RETENTION * 24 * 60 * 60 * 1000);
      posPerfHistory = posPerfHistory.filter(p => p.date >= cutoffDate);
      
      this.perfPositionsDaily.set(pos.symbol, posPerfHistory);
    });
  }

  // D) News, Macro & Geo Storage
  private storeMacroEvent(event: MacroEvent): void {
    this.macroEvents.set(event.id, event);
    
    // Keep only recent events
    if (this.macroEvents.size > 1000) {
      const events = Array.from(this.macroEvents.entries())
        .sort(([,a], [,b]) => b.date.getTime() - a.date.getTime())
        .slice(0, 500);
      
      this.macroEvents.clear();
      events.forEach(([id, evt]) => this.macroEvents.set(id, evt));
    }
  }

  private storeGeoEvent(event: GeoEvent): void {
    this.geoEvents.set(event.id, event);
    
    // Keep only recent events
    if (this.geoEvents.size > 500) {
      const events = Array.from(this.geoEvents.entries())
        .sort(([,a], [,b]) => b.ts_start.getTime() - a.ts_start.getTime())
        .slice(0, 250);
      
      this.geoEvents.clear();
      events.forEach(([id, evt]) => this.geoEvents.set(id, evt));
    }
  }

  // E) Search & Recommendations Storage
  private storeOracleSignal(signal: OracleSignal): void {
    this.oracleSignals.set(signal.id, signal);
    
    // Keep only recent signals
    const cutoffDate = new Date(Date.now() - this.NEWS_RETENTION * 24 * 60 * 60 * 1000);
    Array.from(this.oracleSignals.entries()).forEach(([id, sig]) => {
      if (sig.ts < cutoffDate) {
        this.oracleSignals.delete(id);
      }
    });
  }

  private storeSearchQuery(query: SearchQuery): void {
    this.searchQueries.set(query.id, query);
  }

  // Maintenance Tasks
  private performMaintenance(): void {
    logService.log('debug', 'BID maintenance started');
    
    // Clean up old data based on retention policies
    this.cleanOldCandles();
    this.cleanOldIndicators();
    this.cleanOldRiskData();
    
    logService.log('debug', 'BID maintenance completed', {
      candleKeys: this.candles.size,
      indicatorKeys: this.indicators.size,
      oracleSignals: this.oracleSignals.size,
      macroEvents: this.macroEvents.size
    });
  }

  private cleanOldCandles(): void {
    this.candles.forEach((candles, key) => {
      const [symbol, tf] = key.split('_');
      const retentionDays = this.CANDLE_RETENTION[tf as keyof typeof this.CANDLE_RETENTION];
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const filteredCandles = candles.filter(c => c.ts >= cutoffDate);
      this.candles.set(key, filteredCandles);
    });
  }

  private cleanOldIndicators(): void {
    const cutoffDate = new Date(Date.now() - this.INDICATOR_RETENTION * 24 * 60 * 60 * 1000);
    
    this.indicators.forEach((indicators, key) => {
      const filteredIndicators = indicators.filter(i => i.ts >= cutoffDate);
      this.indicators.set(key, filteredIndicators);
    });
  }

  private cleanOldRiskData(): void {
    const cutoffDate = new Date(Date.now() - this.PORTFOLIO_RETENTION * 24 * 60 * 60 * 1000);
    
    this.riskPortfolio = this.riskPortfolio.filter(r => r.ts >= cutoffDate);
    
    this.riskPositions.forEach((risks, symbol) => {
      const filteredRisks = risks.filter(r => r.ts >= cutoffDate);
      this.riskPositions.set(symbol, filteredRisks);
    });
  }

  // Helper calculation methods (simplified implementations)
  private calculateMA(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const recentCandles = candles.slice(-period);
    const sum = recentCandles.reduce((s, c) => s + c.c, 0);
    return sum / period;
  }

  private calculateRSI(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 50;
    
    const changes = [];
    for (let i = 1; i < candles.length; i++) {
      changes.push(candles[i].c - candles[i-1].c);
    }
    
    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter(c => c > 0).reduce((s, c) => s + c, 0) / period;
    const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((s, c) => s + c, 0)) / period;
    
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(candles: Candle[]): number {
    // Simplified MACD calculation
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    return ema12 - ema26;
  }

  private calculateEMA(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = candles[0].c;
    
    for (let i = 1; i < candles.length; i++) {
      ema = (candles[i].c * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateATR(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i-1];
      
      const tr = Math.max(
        current.h - current.l,
        Math.abs(current.h - previous.c),
        Math.abs(current.l - previous.c)
      );
      
      trueRanges.push(tr);
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((s, tr) => s + tr, 0) / period;
  }

  private calculateBollingerUpper(candles: Candle[], period: number, stdDev: number): number {
    const ma = this.calculateMA(candles, period);
    const variance = this.calculateVariance(candles, period);
    return ma + (stdDev * Math.sqrt(variance));
  }

  private calculateBollingerLower(candles: Candle[], period: number, stdDev: number): number {
    const ma = this.calculateMA(candles, period);
    const variance = this.calculateVariance(candles, period);
    return ma - (stdDev * Math.sqrt(variance));
  }

  private calculateVariance(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const recentCandles = candles.slice(-period);
    const mean = recentCandles.reduce((s, c) => s + c.c, 0) / period;
    const variance = recentCandles.reduce((s, c) => s + Math.pow(c.c - mean, 2), 0) / period;
    
    return variance;
  }

  private calculateVWAP(candles: Candle[]): number {
    if (candles.length === 0) return 0;
    
    const todayCandles = candles.filter(c => {
      const today = new Date();
      return c.ts.toDateString() === today.toDateString();
    });
    
    if (todayCandles.length === 0) return candles[candles.length - 1].c;
    
    let totalVolume = 0;
    let totalVolumePrice = 0;
    
    todayCandles.forEach(c => {
      const typical = (c.h + c.l + c.c) / 3;
      totalVolumePrice += typical * c.v;
      totalVolume += c.v;
    });
    
    return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
  }

  // Risk calculation helpers
  private getSymbolBeta(symbol: string): number {
    // Mock beta values - would calculate from historical data
    const betas: Record<string, number> = {
      'AAPL': 1.2,
      'MSFT': 0.9,
      'GOOGL': 1.1,
      'AMZN': 1.3,
      'TSLA': 2.0,
      'JNJ': 0.7,
      'JPM': 1.1
    };
    return betas[symbol] || 1.0;
  }

  private calculateDrawdown(): number {
    if (this.perfPortfolioDaily.length < 2) return 0;
    
    const returns = this.perfPortfolioDaily.slice(-30); // Last 30 days
    let peak = 1;
    let maxDrawdown = 0;
    
    returns.forEach(perf => {
      const value = 1 + perf.ret_cum;
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    return maxDrawdown * 100;
  }

  private calculateVaR95(positions: PositionCurrent[]): number {
    // Simplified VaR calculation
    const totalValue = positions.reduce((sum, pos) => sum + pos.mv, 0);
    const portfolioVolatility = 0.15; // Mock 15% annual volatility
    const dailyVolatility = portfolioVolatility / Math.sqrt(252);
    return totalValue * dailyVolatility * 1.645; // 95% confidence
  }

  private calculateES95(positions: PositionCurrent[]): number {
    // Expected Shortfall (simplified)
    return this.calculateVaR95(positions) * 1.2;
  }

  private calculateLiquidityScore(positions: PositionCurrent[]): number {
    // Simplified liquidity score
    return positions.reduce((score, pos) => {
      const adv = this.getSymbolADV(pos.symbol);
      const liquidityRatio = Math.min(pos.mv / adv, 1);
      return score + (1 - liquidityRatio);
    }, 0) / positions.length;
  }

  private calculateRiskState(drawdown: number, concentration: number, beta: number): number {
    // Simplified risk state calculation
    const normalizedDD = Math.min(drawdown / 20, 1); // 20% max DD
    const normalizedConc = Math.min(concentration / 50, 1); // 50% max concentration
    const normalizedBeta = Math.min(Math.abs(beta - 1) / 1, 1); // Beta deviation from 1
    
    return ((normalizedDD * 0.5) + (normalizedConc * 0.3) + (normalizedBeta * 0.2)) * 100;
  }

  private calculateADVPercent(symbol: string, marketValue: number): number {
    const adv = this.getSymbolADV(symbol);
    return (marketValue / adv) * 100;
  }

  private getSymbolADV(symbol: string): number {
    // Mock Average Daily Volume values
    const advs: Record<string, number> = {
      'AAPL': 50000000,
      'MSFT': 30000000,
      'GOOGL': 25000000,
      'AMZN': 35000000,
      'TSLA': 40000000,
      'JNJ': 15000000,
      'JPM': 20000000
    };
    return advs[symbol] || 10000000;
  }

  private estimateSpread(symbol: string): number {
    // Mock spread estimates
    const spreads: Record<string, number> = {
      'AAPL': 0.01,
      'MSFT': 0.01,
      'GOOGL': 0.02,
      'AMZN': 0.02,
      'TSLA': 0.03,
      'JNJ': 0.02,
      'JPM': 0.02
    };
    return spreads[symbol] || 0.05;
  }

  private getYesterdayEquity(): number {
    if (this.perfPortfolioDaily.length === 0) return 0;
    const yesterday = this.perfPortfolioDaily[this.perfPortfolioDaily.length - 1];
    return this.portfolioCurrent!.equity / (1 + yesterday.ret_d);
  }

  private calculateCumulativeReturn(): number {
    if (this.perfPortfolioDaily.length === 0) return 0;
    return this.perfPortfolioDaily.reduce((cum, perf) => (1 + cum) * (1 + perf.ret_d) - 1, 0);
  }

  private calculatePositionCumulativeReturn(symbol: string): number {
    const perfHistory = this.perfPositionsDaily.get(symbol) || [];
    if (perfHistory.length === 0) return 0;
    return perfHistory.reduce((cum, perf) => (1 + cum) * (1 + perf.ret_d) - 1, 0);
  }

  // Seed data initialization
  private initializeSeedData(): void {
    this.seedRefSymbols();
    this.seedMacroEvents();
    this.seedGeoEvents();
    this.seedOracleSignals();
  }

  private seedRefSymbols(): void {
    const symbols: RefSymbol[] = [
      { symbol: 'AAPL', exchange: 'NASDAQ', asset_class: 'equity', sector: 'Technology', industry: 'Consumer Electronics', updated_ts: new Date() },
      { symbol: 'MSFT', exchange: 'NASDAQ', asset_class: 'equity', sector: 'Technology', industry: 'Software', updated_ts: new Date() },
      { symbol: 'GOOGL', exchange: 'NASDAQ', asset_class: 'equity', sector: 'Technology', industry: 'Software', updated_ts: new Date() },
      { symbol: 'AMZN', exchange: 'NASDAQ', asset_class: 'equity', sector: 'Consumer', industry: 'E-commerce', updated_ts: new Date() },
      { symbol: 'TSLA', exchange: 'NASDAQ', asset_class: 'equity', sector: 'Consumer', industry: 'Automotive', updated_ts: new Date() },
      { symbol: 'JNJ', exchange: 'NYSE', asset_class: 'equity', sector: 'Healthcare', industry: 'Pharmaceuticals', updated_ts: new Date() },
      { symbol: 'JPM', exchange: 'NYSE', asset_class: 'equity', sector: 'Finance', industry: 'Banking', updated_ts: new Date() },
      { symbol: 'SPY', exchange: 'ARCA', asset_class: 'etf', sector: 'Broad Market', industry: 'Index Fund', updated_ts: new Date() }
    ];

    symbols.forEach(symbol => this.storeRefSymbol(symbol));
  }

  private seedMacroEvents(): void {
    const events: MacroEvent[] = [
      {
        id: generateULID('mcr_'),
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        type: 'CPI',
        actual: 3.2,
        consensus: 3.1,
        surprise: 0.1,
        impact: 'bear'
      },
      {
        id: generateULID('mcr_'),
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        type: 'NFP',
        actual: 250000,
        consensus: 200000,
        surprise: 50000,
        impact: 'bull'
      },
      {
        id: generateULID('mcr_'),
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        type: 'FOMC',
        actual: 5.25,
        consensus: 5.25,
        surprise: 0,
        impact: 'neutral'
      }
    ];

    events.forEach(event => this.storeMacroEvent(event));
  }

  private seedGeoEvents(): void {
    const events: GeoEvent[] = [
      {
        id: generateULID('geo_'),
        ts_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        region: 'Europe',
        type: 'sanctions',
        severity: 3,
        affected_assets: ['XOM', 'CVX'],
        impact_dir: 'bull',
        confidence: 0.8
      },
      {
        id: generateULID('geo_'),
        ts_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        region: 'OPEC+',
        type: 'production_cut',
        severity: 2,
        affected_assets: ['XOM', 'CVX', 'Energy'],
        impact_dir: 'bull',
        confidence: 0.9
      }
    ];

    events.forEach(event => this.storeGeoEvent(event));
  }

  private seedOracleSignals(): void {
    const signals: OracleSignal[] = [
      {
        id: generateULID('orc_'),
        symbol: 'AAPL',
        signal_type: 'momentum',
        strength: 0.75,
        direction: 'bull',
        source: 'technical_analysis',
        ts: new Date(Date.now() - 2 * 60 * 60 * 1000),
        summary: 'Strong upward momentum with volume confirmation'
      },
      {
        id: generateULID('orc_'),
        symbol: 'TSLA',
        signal_type: 'vol_spike',
        strength: 0.85,
        direction: 'neutral',
        source: 'options_flow',
        ts: new Date(Date.now() - 1 * 60 * 60 * 1000),
        summary: 'Unusual options activity detected'
      },
      {
        id: generateULID('orc_'),
        symbol: 'MSFT',
        signal_type: 'earnings_window',
        strength: 0.65,
        direction: 'bull',
        source: 'earnings_calendar',
        ts: new Date(Date.now() - 30 * 60 * 1000),
        summary: 'Approaching earnings with positive sentiment'
      }
    ];

    signals.forEach(signal => this.storeOracleSignal(signal));
  }

  // Public API for data access
  public getRefSymbol(symbol: string): RefSymbol | null {
    return this.refSymbols.get(symbol) || null;
  }

  public getAllRefSymbols(): RefSymbol[] {
    return Array.from(this.refSymbols.values());
  }

  public getCandles(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | 'D1', limit = 100): Candle[] {
    const key = `${symbol}_${tf}`;
    const candles = this.candles.get(key) || [];
    return candles.slice(-limit);
  }

  public getIndicators(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | 'D1', limit = 30): Indicator[] {
    const key = `${symbol}_${tf}`;
    const indicators = this.indicators.get(key) || [];
    return indicators.slice(-limit);
  }

  public getPortfolioCurrent(): PortfolioCurrent | null {
    return this.portfolioCurrent;
  }

  public getPositionsCurrent(): PositionCurrent[] {
    return Array.from(this.positionsCurrent.values());
  }

  public getLatestRiskPortfolio(): RiskPortfolio | null {
    return this.riskPortfolio[this.riskPortfolio.length - 1] || null;
  }

  public getRiskPositions(symbol: string): RiskPosition[] {
    return this.riskPositions.get(symbol) || [];
  }

  public getOracleSignals(limit = 50): OracleSignal[] {
    return Array.from(this.oracleSignals.values())
      .sort((a, b) => b.ts.getTime() - a.ts.getTime())
      .slice(0, limit);
  }

  public getMacroEvents(limit = 20): MacroEvent[] {
    return Array.from(this.macroEvents.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  public getGeoEvents(limit = 10): GeoEvent[] {
    return Array.from(this.geoEvents.values())
      .sort((a, b) => b.ts_start.getTime() - a.ts_start.getTime())
      .slice(0, limit);
  }

  public getPerformanceDaily(days = 30): PerfPortfolioDaily[] {
    return this.perfPortfolioDaily.slice(-days);
  }

  public getPositionPerformance(symbol: string, days = 30): PerfPositionDaily[] {
    const perfHistory = this.perfPositionsDaily.get(symbol) || [];
    return perfHistory.slice(-days);
  }

  // Health and diagnostics
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      symbols: number;
      candleSeries: number;
      indicatorSeries: number;
      oracleSignals: number;
      portfolioAge: number;
    };
  } {
    const portfolioAge = this.portfolioCurrent ? 
      (Date.now() - this.portfolioCurrent.updated_ts.getTime()) / (1000 * 60) : 999;
    
    const metrics = {
      symbols: this.refSymbols.size,
      candleSeries: this.candles.size,
      indicatorSeries: this.indicators.size,
      oracleSignals: this.oracleSignals.size,
      portfolioAge // minutes
    };
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (portfolioAge > 10 || metrics.oracleSignals === 0) {
      status = 'degraded';
    }
    
    if (portfolioAge > 60 || metrics.symbols === 0) {
      status = 'unhealthy';
    }
    
    return { status, metrics };
  }
}

// Export singleton instance
export const bidCore = new BIDCore();
