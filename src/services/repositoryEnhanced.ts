// Enhanced Repository Service - Data cleaning, normalization, and aggregation per specification

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { getFreshnessLevel } from '@/utils/formulas';
import { EVENT_TOPICS } from '@/utils/constants';

export interface RawFeedData {
  id: string;
  source: string;
  symbol?: string;
  timestamp: Date;
  data_type: 'price' | 'news' | 'volume' | 'options' | 'fundamental';
  raw_data: any;
  received_at: Date;
}

export interface CleanedCandle {
  symbol: string;
  timestamp: Date;
  period: '1m' | '5m' | '15m' | '1h' | 'D1';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export interface CleanedSnapshot {
  id: string;
  symbol: string;
  price: number;
  volume: number;
  change: number;
  change_percent: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
  freshness: 'live' | 'warm' | 'stale';
  quality_score: number;
}

export interface TickerResolution {
  input: string;
  canonical: string;
  aliases: string[];
  market: string;
  asset_type: 'stock' | 'etf' | 'crypto' | 'forex' | 'option';
}

export interface RollingStats {
  symbol: string;
  period: '1d' | '7d' | '30d';
  avg_volume: number;
  avg_price: number;
  volatility: number;
  beta: number;
  correlation_spy: number;
  last_updated: Date;
}

export interface DataQualityMetrics {
  total_feeds_processed: number;
  rejected_stale: number;
  rejected_malformed: number;
  deduplication_count: number;
  uptime_percent: number;
  avg_processing_latency_ms: number;
  last_reset: Date;
}

class EnhancedRepositoryService {
  private rawFeeds: Map<string, RawFeedData> = new Map();
  private cleanedSnapshots: Map<string, CleanedSnapshot> = new Map();
  private candles: Map<string, CleanedCandle[]> = new Map();
  private tickerMap: Map<string, TickerResolution> = new Map();
  private rollingStats: Map<string, RollingStats> = new Map();
  private qualityMetrics: DataQualityMetrics;
  private processingQueue: RawFeedData[] = [];
  private isProcessing = false;

  constructor() {
    this.qualityMetrics = {
      total_feeds_processed: 0,
      rejected_stale: 0,
      rejected_malformed: 0,
      deduplication_count: 0,
      uptime_percent: 100,
      avg_processing_latency_ms: 0,
      last_reset: new Date()
    };

    this.initializeTickerMap();
    this.initializeEventListeners();
    this.startProcessingLoop();
  }

  private initializeTickerMap() {
    // Initialize common ticker mappings
    const commonTickers = [
      { input: 'AAPL', canonical: 'AAPL', aliases: ['Apple'], market: 'NASDAQ', asset_type: 'stock' as const },
      { input: 'MSFT', canonical: 'MSFT', aliases: ['Microsoft'], market: 'NASDAQ', asset_type: 'stock' as const },
      { input: 'GOOGL', canonical: 'GOOGL', aliases: ['Google', 'Alphabet'], market: 'NASDAQ', asset_type: 'stock' as const },
      { input: 'AMZN', canonical: 'AMZN', aliases: ['Amazon'], market: 'NASDAQ', asset_type: 'stock' as const },
      { input: 'TSLA', canonical: 'TSLA', aliases: ['Tesla'], market: 'NASDAQ', asset_type: 'stock' as const },
      { input: 'SPY', canonical: 'SPY', aliases: ['S&P 500'], market: 'ARCA', asset_type: 'etf' as const }
    ];

    commonTickers.forEach(ticker => {
      this.tickerMap.set(ticker.input, ticker);
      ticker.aliases.forEach(alias => {
        this.tickerMap.set(alias.toUpperCase(), ticker);
      });
    });
  }

  private initializeEventListeners() {
    // Listen for raw feed data from various sources
    eventBus.on('feed.data_received', (data: RawFeedData) => {
      this.ingestRawFeed(data);
    });

    // Listen for CSV imports from Cradle
    eventBus.on('cradle.csv_imported', (data: any) => {
      this.processCsvImport(data);
    });

    // Listen for broker snapshots
    eventBus.on('broker.snapshot_received', (data: any) => {
      this.processBrokerSnapshot(data);
    });
  }

  private startProcessingLoop() {
    // Process queue every 100ms
    setInterval(() => {
      this.processQueue();
    }, 100);

    // Update rolling stats every minute
    setInterval(() => {
      this.updateRollingStats();
    }, 60000);

    // Quality metrics reset daily
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  // Data Ingestion and Cleaning
  public ingestRawFeed(feedData: RawFeedData): void {
    const startTime = Date.now();

    try {
      // Validate basic structure
      if (!this.validateFeedStructure(feedData)) {
        this.qualityMetrics.rejected_malformed++;
        logService.log('warn', 'Rejected malformed feed data', { source: feedData.source });
        return;
      }

      // Check for staleness
      const ageSeconds = (Date.now() - feedData.timestamp.getTime()) / 1000;
      if (ageSeconds > 300) { // 5 minutes stale threshold
        this.qualityMetrics.rejected_stale++;
        eventBus.emit('repository.stale_rejected', { feedId: feedData.id, ageSeconds });
        return;
      }

      // Check for duplicates
      if (this.rawFeeds.has(feedData.id)) {
        this.qualityMetrics.deduplication_count++;
        return;
      }

      // Add to processing queue
      this.rawFeeds.set(feedData.id, feedData);
      this.processingQueue.push(feedData);
      this.qualityMetrics.total_feeds_processed++;

      // Update latency metrics
      const latency = Date.now() - startTime;
      this.qualityMetrics.avg_processing_latency_ms = 
        (this.qualityMetrics.avg_processing_latency_ms * 0.9) + (latency * 0.1);

      eventBus.emit('repository.feed_processed', { 
        feedId: feedData.id, 
        source: feedData.source,
        latency 
      });

    } catch (error) {
      logService.log('error', 'Feed ingestion error', { error, feedId: feedData.id });
      this.qualityMetrics.rejected_malformed++;
    }
  }

  private validateFeedStructure(feedData: RawFeedData): boolean {
    return !!(
      feedData.id &&
      feedData.source &&
      feedData.timestamp &&
      feedData.data_type &&
      feedData.raw_data &&
      feedData.received_at
    );
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = Math.min(10, this.processingQueue.length);
      const batch = this.processingQueue.splice(0, batchSize);

      for (const feedData of batch) {
        await this.processFeedData(feedData);
      }
    } catch (error) {
      logService.log('error', 'Queue processing error', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processFeedData(feedData: RawFeedData): Promise<void> {
    try {
      switch (feedData.data_type) {
        case 'price':
          await this.processPriceData(feedData);
          break;
        case 'news':
          await this.processNewsData(feedData);
          break;
        case 'volume':
          await this.processVolumeData(feedData);
          break;
        case 'options':
          await this.processOptionsData(feedData);
          break;
        case 'fundamental':
          await this.processFundamentalData(feedData);
          break;
        default:
          logService.log('warn', 'Unknown data type', { dataType: feedData.data_type });
      }
    } catch (error) {
      logService.log('error', 'Feed data processing error', { error, feedId: feedData.id });
    }
  }

  private async processPriceData(feedData: RawFeedData): Promise<void> {
    const rawData = feedData.raw_data;
    
    // Resolve ticker to canonical form
    const tickerResolution = this.resolveTicker(feedData.symbol || rawData.symbol);
    if (!tickerResolution) {
      logService.log('warn', 'Unable to resolve ticker', { symbol: feedData.symbol });
      return;
    }

    // Create cleaned snapshot
    const snapshot: CleanedSnapshot = {
      id: generateULID('snap_'),
      symbol: tickerResolution.canonical,
      price: this.normalizePrice(rawData.price || rawData.last || rawData.close),
      volume: this.normalizeVolume(rawData.volume || 0),
      change: rawData.change || 0,
      change_percent: rawData.change_percent || 0,
      bid: rawData.bid || rawData.price || 0,
      ask: rawData.ask || rawData.price || 0,
      spread: Math.abs((rawData.ask || rawData.price || 0) - (rawData.bid || rawData.price || 0)),
      timestamp: feedData.timestamp,
      freshness: getFreshnessLevel((Date.now() - feedData.timestamp.getTime()) / 1000),
      quality_score: this.calculateQualityScore(rawData)
    };

    this.cleanedSnapshots.set(snapshot.symbol, snapshot);

    // Create/update candles
    this.updateCandles(snapshot);

    // Emit cleaned data event
    eventBus.emit(EVENT_TOPICS.MARKET_DATA_RECEIVED, {
      symbol: snapshot.symbol,
      snapshot,
      timestamp: new Date()
    });
  }

  private async processNewsData(feedData: RawFeedData): Promise<void> {
    // Process news data for sentiment analysis
    const newsData = {
      id: generateULID('news_'),
      symbol: this.resolveTicker(feedData.symbol)?.canonical,
      headline: feedData.raw_data.headline,
      summary: feedData.raw_data.summary,
      sentiment: this.extractSentiment(feedData.raw_data),
      timestamp: feedData.timestamp,
      source: feedData.source
    };

    eventBus.emit('oracle.news_processed', newsData);
  }

  private async processVolumeData(feedData: RawFeedData): Promise<void> {
    // Process volume data for unusual volume detection
    const volumeData = {
      symbol: this.resolveTicker(feedData.symbol)?.canonical,
      volume: feedData.raw_data.volume,
      avg_volume: feedData.raw_data.avg_volume,
      volume_ratio: feedData.raw_data.volume / (feedData.raw_data.avg_volume || 1),
      timestamp: feedData.timestamp
    };

    eventBus.emit('oracle.volume_processed', volumeData);
  }

  private async processOptionsData(feedData: RawFeedData): Promise<void> {
    // Process options flow data
    const optionsData = {
      symbol: this.resolveTicker(feedData.symbol)?.canonical,
      unusual_activity: feedData.raw_data.unusual_activity,
      put_call_ratio: feedData.raw_data.put_call_ratio,
      implied_volatility: feedData.raw_data.implied_volatility,
      timestamp: feedData.timestamp
    };

    eventBus.emit('oracle.options_processed', optionsData);
  }

  private async processFundamentalData(feedData: RawFeedData): Promise<void> {
    // Process fundamental data
    const fundamentalData = {
      symbol: this.resolveTicker(feedData.symbol)?.canonical,
      earnings_date: feedData.raw_data.earnings_date,
      pe_ratio: feedData.raw_data.pe_ratio,
      market_cap: feedData.raw_data.market_cap,
      beta: feedData.raw_data.beta,
      timestamp: feedData.timestamp
    };

    eventBus.emit('oracle.fundamental_processed', fundamentalData);
  }

  // Ticker Resolution
  public resolveTicker(input?: string): TickerResolution | null {
    if (!input) return null;
    
    const normalized = input.toUpperCase().trim();
    return this.tickerMap.get(normalized) || null;
  }

  public addTickerMapping(input: string, canonical: string, aliases: string[] = [], market = 'UNKNOWN', assetType: 'stock' | 'etf' | 'crypto' | 'forex' | 'option' = 'stock'): void {
    const resolution: TickerResolution = {
      input,
      canonical,
      aliases,
      market,
      asset_type: assetType
    };

    this.tickerMap.set(input.toUpperCase(), resolution);
    aliases.forEach(alias => {
      this.tickerMap.set(alias.toUpperCase(), resolution);
    });
  }

  // Data Normalization
  private normalizePrice(price: any): number {
    const num = parseFloat(price);
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  private normalizeVolume(volume: any): number {
    const num = parseInt(volume);
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  private calculateQualityScore(rawData: any): number {
    let score = 1.0;
    
    // Reduce score for missing fields
    if (!rawData.bid || !rawData.ask) score -= 0.2;
    if (!rawData.volume) score -= 0.3;
    if (!rawData.change || !rawData.change_percent) score -= 0.1;
    
    // Reduce score for suspicious values
    if (rawData.spread && rawData.spread > rawData.price * 0.1) score -= 0.2; // Wide spread
    if (rawData.volume < 100) score -= 0.2; // Low volume
    
    return Math.max(0, score);
  }

  private extractSentiment(newsData: any): number {
    // Simple sentiment extraction - would use NLP in production
    const text = (newsData.headline + ' ' + newsData.summary).toLowerCase();
    
    const positiveWords = ['up', 'rise', 'gain', 'bull', 'strong', 'growth', 'profit'];
    const negativeWords = ['down', 'fall', 'loss', 'bear', 'weak', 'decline', 'loss'];
    
    let sentiment = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) sentiment += 0.1;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) sentiment -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, sentiment));
  }

  // Candle Generation
  private updateCandles(snapshot: CleanedSnapshot): void {
    const periods: ('1m' | '5m' | '15m' | '1h' | 'D1')[] = ['1m', '5m', '15m', '1h', 'D1'];
    
    periods.forEach(period => {
      this.updateCandleForPeriod(snapshot, period);
    });
  }

  private updateCandleForPeriod(snapshot: CleanedSnapshot, period: '1m' | '5m' | '15m' | '1h' | 'D1'): void {
    const key = `${snapshot.symbol}_${period}`;
    let candles = this.candles.get(key) || [];
    
    const candleTimestamp = this.getCandleTimestamp(snapshot.timestamp, period);
    const existingCandle = candles.find(c => c.timestamp.getTime() === candleTimestamp.getTime());
    
    if (existingCandle) {
      // Update existing candle
      existingCandle.high = Math.max(existingCandle.high, snapshot.price);
      existingCandle.low = Math.min(existingCandle.low, snapshot.price);
      existingCandle.close = snapshot.price;
      existingCandle.volume += snapshot.volume;
      existingCandle.vwap = (existingCandle.vwap * 0.9) + (snapshot.price * 0.1); // Simple VWAP approximation
    } else {
      // Create new candle
      const newCandle: CleanedCandle = {
        symbol: snapshot.symbol,
        timestamp: candleTimestamp,
        period,
        open: snapshot.price,
        high: snapshot.price,
        low: snapshot.price,
        close: snapshot.price,
        volume: snapshot.volume,
        vwap: snapshot.price
      };
      
      candles.push(newCandle);
      candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Keep only last 1000 candles per symbol/period
      if (candles.length > 1000) {
        candles = candles.slice(-1000);
      }
    }
    
    this.candles.set(key, candles);
  }

  private getCandleTimestamp(timestamp: Date, period: string): Date {
    const date = new Date(timestamp);
    
    switch (period) {
      case '1m':
        date.setSeconds(0, 0);
        break;
      case '5m':
        date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
        break;
      case '15m':
        date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
        break;
      case '1h':
        date.setMinutes(0, 0, 0);
        break;
      case 'D1':
        date.setHours(0, 0, 0, 0);
        break;
    }
    
    return date;
  }

  // Rolling Statistics
  private updateRollingStats(): void {
    const symbols = new Set<string>();
    
    // Collect all symbols
    this.cleanedSnapshots.forEach((_, symbol) => symbols.add(symbol));
    
    symbols.forEach(symbol => {
      this.calculateRollingStatsForSymbol(symbol);
    });
  }

  private calculateRollingStatsForSymbol(symbol: string): void {
    const candles = this.candles.get(`${symbol}_D1`) || [];
    if (candles.length < 2) return;
    
    const periods: ('1d' | '7d' | '30d')[] = ['1d', '7d', '30d'];
    
    periods.forEach(period => {
      const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
      const recentCandles = candles.slice(-days);
      
      if (recentCandles.length === 0) return;
      
      const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;
      const volatility = this.calculateVolatility(recentCandles);
      
      const stats: RollingStats = {
        symbol,
        period,
        avg_volume: avgVolume,
        avg_price: avgPrice,
        volatility,
        beta: this.calculateBeta(recentCandles), // Simplified
        correlation_spy: 0.5, // Mock correlation
        last_updated: new Date()
      };
      
      this.rollingStats.set(`${symbol}_${period}`, stats);
    });
  }

  private calculateVolatility(candles: CleanedCandle[]): number {
    if (candles.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const return_ = Math.log(candles[i].close / candles[i-1].close);
      returns.push(return_);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateBeta(candles: CleanedCandle[]): number {
    // Simplified beta calculation - would use market index in production
    return 0.8 + Math.random() * 0.4; // Mock beta between 0.8 and 1.2
  }

  // CSV Import Processing
  private processCsvImport(data: any): void {
    try {
      const csvRows = data.rows || [];
      
      csvRows.forEach((row: any, index: number) => {
        const feedData: RawFeedData = {
          id: generateULID('csv_'),
          source: 'csv_import',
          symbol: row.symbol || row.ticker,
          timestamp: new Date(row.timestamp || row.date || Date.now()),
          data_type: 'price',
          raw_data: {
            price: parseFloat(row.price || row.close),
            volume: parseInt(row.volume || 0),
            open: parseFloat(row.open || row.price),
            high: parseFloat(row.high || row.price),
            low: parseFloat(row.low || row.price),
            close: parseFloat(row.close || row.price)
          },
          received_at: new Date()
        };
        
        this.ingestRawFeed(feedData);
      });
      
      logService.log('info', 'CSV import processed', { 
        rowCount: csvRows.length,
        source: data.filename 
      });
      
    } catch (error) {
      logService.log('error', 'CSV import processing error', { error });
    }
  }

  // Broker Snapshot Processing
  private processBrokerSnapshot(data: any): void {
    try {
      const positions = data.positions || [];
      
      positions.forEach((position: any) => {
        const feedData: RawFeedData = {
          id: generateULID('brk_'),
          source: 'broker_snapshot',
          symbol: position.symbol,
          timestamp: new Date(),
          data_type: 'price',
          raw_data: {
            price: position.current_price,
            volume: 0, // Broker snapshots don't typically include volume
            quantity: position.quantity,
            market_value: position.market_value,
            unrealized_pnl: position.unrealized_pnl
          },
          received_at: new Date()
        };
        
        this.ingestRawFeed(feedData);
      });
      
    } catch (error) {
      logService.log('error', 'Broker snapshot processing error', { error });
    }
  }

  // Metrics and Cleanup
  private resetDailyMetrics(): void {
    const yesterday = this.qualityMetrics;
    
    // Archive yesterday's metrics
    logService.log('info', 'Daily metrics archived', {
      processed: yesterday.total_feeds_processed,
      rejected_stale: yesterday.rejected_stale,
      rejected_malformed: yesterday.rejected_malformed,
      dedupes: yesterday.deduplication_count,
      uptime: yesterday.uptime_percent
    });
    
    // Reset counters
    this.qualityMetrics = {
      total_feeds_processed: 0,
      rejected_stale: 0,
      rejected_malformed: 0,
      deduplication_count: 0,
      uptime_percent: 100,
      avg_processing_latency_ms: 0,
      last_reset: new Date()
    };
  }

  // Public API
  public getLatestSnapshot(symbol: string): CleanedSnapshot | null {
    return this.cleanedSnapshots.get(symbol) || null;
  }

  public getAllSnapshots(): CleanedSnapshot[] {
    return Array.from(this.cleanedSnapshots.values());
  }

  public getCandles(symbol: string, period: '1m' | '5m' | '15m' | '1h' | 'D1', limit = 100): CleanedCandle[] {
    const key = `${symbol}_${period}`;
    const candles = this.candles.get(key) || [];
    return candles.slice(-limit);
  }

  public getRollingStats(symbol: string, period: '1d' | '7d' | '30d'): RollingStats | null {
    return this.rollingStats.get(`${symbol}_${period}`) || null;
  }

  public getQualityMetrics(): DataQualityMetrics {
    return { ...this.qualityMetrics };
  }

  public getTickerResolutions(): TickerResolution[] {
    return Array.from(this.tickerMap.values());
  }

  public getProcessingQueueLength(): number {
    return this.processingQueue.length;
  }
}

// Export singleton instance
export const repositoryEnhanced = new EnhancedRepositoryService();
