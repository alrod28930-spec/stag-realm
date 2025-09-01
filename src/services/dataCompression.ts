import { logService } from './logging';
import { eventBus } from './eventBus';
import type { 
  PriceTick, 
  CandleData, 
  NewsFeed, 
  SentimentSummary, 
  VolatilityMetrics,
  DataCompressionRule,
  CompressionJob,
  DataSummary
} from '@/types/compression';

class DataCompressionService {
  private compressionRules: Map<string, DataCompressionRule> = new Map();
  private activeJobs: Map<string, CompressionJob> = new Map();
  private compressionQueue: string[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.startCompressionScheduler();
  }

  private initializeDefaultRules() {
    const defaultRules: DataCompressionRule[] = [
      {
        dataType: 'price_ticks',
        retentionPeriod: 7, // Keep raw ticks for 7 days
        compressionRatio: 0.1, // Compress to 10% of original size
        summaryMethod: 'candles',
        archiveAfter: 30,
        deleteAfter: 365
      },
      {
        dataType: 'news_feeds',
        retentionPeriod: 30,
        compressionRatio: 0.2,
        summaryMethod: 'sentiment',
        archiveAfter: 90,
        deleteAfter: 730
      },
      {
        dataType: 'trade_signals',
        retentionPeriod: 90,
        compressionRatio: 0.3,
        summaryMethod: 'key_events',
        archiveAfter: 180
      },
      {
        dataType: 'bot_logs',
        retentionPeriod: 14,
        compressionRatio: 0.05,
        summaryMethod: 'key_events',
        archiveAfter: 60,
        deleteAfter: 180
      }
    ];

    defaultRules.forEach(rule => {
      this.compressionRules.set(rule.dataType, rule);
    });
  }

  private startCompressionScheduler() {
    // Run compression checks every hour
    setInterval(() => {
      this.processCompressionQueue();
    }, 60 * 60 * 1000);

    // Initial run
    setTimeout(() => this.processCompressionQueue(), 5000);
  }

  // Convert raw price ticks to candlestick data
  compressPriceData(rawTicks: PriceTick[], timeframe: CandleData['timeframe'] = '1m'): CandleData[] {
    if (rawTicks.length === 0) return [];

    const candles: CandleData[] = [];
    const timeframeMs = this.getTimeframeMilliseconds(timeframe);
    
    // Group ticks by timeframe
    const tickGroups = this.groupTicksByTimeframe(rawTicks, timeframeMs);
    
    tickGroups.forEach(ticks => {
      if (ticks.length === 0) return;
      
      const symbol = ticks[0].symbol;
      const startTime = new Date(Math.floor(ticks[0].timestamp.getTime() / timeframeMs) * timeframeMs);
      const endTime = new Date(startTime.getTime() + timeframeMs);
      
      const prices = ticks.map(t => t.price);
      const volumes = ticks.map(t => t.volume);
      
      const candle: CandleData = {
        symbol,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: volumes.reduce((sum, vol) => sum + vol, 0),
        startTime,
        endTime,
        timeframe,
        tickCount: ticks.length
      };
      
      candles.push(candle);
    });

    logService.log('info', 'Price data compressed', {
      originalTicks: rawTicks.length,
      compressedCandles: candles.length,
      compressionRatio: (candles.length / rawTicks.length).toFixed(3),
      timeframe
    });

    return candles;
  }

  // Summarize news feeds into sentiment analysis
  summarizeSentiment(newsFeeds: NewsFeed[], symbol?: string, timeframe: string = '1d'): SentimentSummary {
    let relevantNews = newsFeeds;
    
    if (symbol) {
      relevantNews = newsFeeds.filter(news => 
        news.symbols.includes(symbol) || 
        news.title.includes(symbol) || 
        news.content.includes(symbol)
      );
    }

    if (relevantNews.length === 0) {
      return this.createEmptySentimentSummary(symbol, timeframe);
    }

    // Calculate overall sentiment
    const sentimentScores = relevantNews.map(news => {
      switch (news.sentiment) {
        case 'positive': return news.relevanceScore;
        case 'negative': return -news.relevanceScore;
        default: return 0;
      }
    });

    const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    
    // Determine overall sentiment category
    let overallSentiment: 'bullish' | 'bearish' | 'neutral';
    if (averageSentiment > 0.2) overallSentiment = 'bullish';
    else if (averageSentiment < -0.2) overallSentiment = 'bearish';
    else overallSentiment = 'neutral';

    // Extract key phrases (simplified - in production would use NLP)
    const keyPhrases = this.extractKeyPhrases(relevantNews);
    
    // Source breakdown
    const sourceBreakdown: { [source: string]: number } = {};
    relevantNews.forEach(news => {
      sourceBreakdown[news.source] = (sourceBreakdown[news.source] || 0) + 1;
    });

    const summary: SentimentSummary = {
      symbol,
      overallSentiment,
      sentimentScore: averageSentiment,
      confidence: this.calculateSentimentConfidence(relevantNews),
      keyPhrases,
      newsCount: relevantNews.length,
      sourceBreakdown,
      timeframe,
      generatedAt: new Date()
    };

    logService.log('info', 'Sentiment summary generated', {
      symbol,
      newsCount: relevantNews.length,
      sentiment: overallSentiment,
      confidence: summary.confidence
    });

    return summary;
  }

  // Calculate volatility metrics from price data
  calculateVolatilityMetrics(priceData: CandleData[], period: string = '1d'): VolatilityMetrics | null {
    if (priceData.length < 2) return null;

    const symbol = priceData[0].symbol;
    const returns = this.calculateReturns(priceData);
    
    const historicalVolatility = this.calculateHistoricalVolatility(returns);
    const realizedVolatility = this.calculateRealizedVolatility(returns);
    const volatilityRank = this.calculateVolatilityRank(historicalVolatility, returns);

    return {
      symbol,
      period,
      historicalVolatility,
      realizedVolatility,
      volatilityRank,
      calculatedAt: new Date()
    };
  }

  // Queue data for compression
  queueCompression(dataType: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (!this.compressionQueue.includes(dataType)) {
      if (priority === 'high') {
        this.compressionQueue.unshift(dataType);
      } else {
        this.compressionQueue.push(dataType);
      }
      
      logService.log('info', 'Data compression queued', { dataType, priority });
    }
  }

  // Process compression queue
  private async processCompressionQueue() {
    if (this.compressionQueue.length === 0) return;

    const dataType = this.compressionQueue.shift()!;
    const rule = this.compressionRules.get(dataType);
    
    if (!rule) {
      logService.log('warn', 'No compression rule found', { dataType });
      return;
    }

    await this.executeCompressionJob(dataType, rule);
  }

  private async executeCompressionJob(dataType: string, rule: DataCompressionRule) {
    const jobId = `compression_${dataType}_${Date.now()}`;
    
    const job: CompressionJob = {
      jobId,
      dataType,
      startDate: new Date(Date.now() - rule.retentionPeriod * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      status: 'running',
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      itemsProcessed: 0,
      errors: [],
      startedAt: new Date()
    };

    this.activeJobs.set(jobId, job);

    try {
      // Simulate compression process
      await this.simulateCompression(job, rule);
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.compressionRatio = job.compressedSize / job.originalSize;

      logService.log('info', 'Compression job completed', {
        jobId,
        dataType,
        compressionRatio: job.compressionRatio,
        itemsProcessed: job.itemsProcessed
      });

      // Emit completion event
      eventBus.emit('data.compression_completed', job);

    } catch (error) {
      job.status = 'failed';
      job.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      logService.log('error', 'Compression job failed', {
        jobId,
        dataType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.activeJobs.delete(jobId);
  }

  private async simulateCompression(job: CompressionJob, rule: DataCompressionRule): Promise<void> {
    // Simulate compression work
    const itemsToProcess = Math.floor(Math.random() * 10000) + 1000;
    const originalSizePerItem = Math.floor(Math.random() * 500) + 100;
    
    job.originalSize = itemsToProcess * originalSizePerItem;
    job.compressedSize = job.originalSize * rule.compressionRatio;
    job.itemsProcessed = itemsToProcess;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Utility methods
  private getTimeframeMilliseconds(timeframe: CandleData['timeframe']): number {
    const timeframes = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe];
  }

  private groupTicksByTimeframe(ticks: PriceTick[], timeframeMs: number): PriceTick[][] {
    const groups: Map<number, PriceTick[]> = new Map();
    
    ticks.forEach(tick => {
      const bucketTime = Math.floor(tick.timestamp.getTime() / timeframeMs) * timeframeMs;
      
      if (!groups.has(bucketTime)) {
        groups.set(bucketTime, []);
      }
      groups.get(bucketTime)!.push(tick);
    });

    return Array.from(groups.values());
  }

  private createEmptySentimentSummary(symbol?: string, timeframe: string = '1d'): SentimentSummary {
    return {
      symbol,
      overallSentiment: 'neutral',
      sentimentScore: 0,
      confidence: 0,
      keyPhrases: [],
      newsCount: 0,
      sourceBreakdown: {},
      timeframe,
      generatedAt: new Date()
    };
  }

  private extractKeyPhrases(newsFeeds: NewsFeed[]): string[] {
    // Simplified key phrase extraction
    const phrases: Map<string, number> = new Map();
    
    newsFeeds.forEach(news => {
      const words = news.title.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['the', 'and', 'or', 'but', 'for', 'with', 'this', 'that'].includes(word));
      
      words.forEach(word => {
        phrases.set(word, (phrases.get(word) || 0) + 1);
      });
    });

    return Array.from(phrases.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  private calculateSentimentConfidence(newsFeeds: NewsFeed[]): number {
    if (newsFeeds.length === 0) return 0;
    
    const avgRelevance = newsFeeds.reduce((sum, news) => sum + news.relevanceScore, 0) / newsFeeds.length;
    const sourceDiversity = new Set(newsFeeds.map(news => news.source)).size;
    
    // Confidence based on relevance and source diversity
    return Math.min(1, avgRelevance * (1 + Math.log(sourceDiversity) / 10));
  }

  private calculateReturns(priceData: CandleData[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < priceData.length; i++) {
      const currentPrice = priceData[i].close;
      const previousPrice = priceData[i - 1].close;
      const return_ = (currentPrice - previousPrice) / previousPrice;
      returns.push(return_);
    }
    
    return returns;
  }

  private calculateHistoricalVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  private calculateRealizedVolatility(returns: number[]): number {
    // Simplified realized volatility calculation
    return this.calculateHistoricalVolatility(returns.slice(-30)); // Last 30 periods
  }

  private calculateVolatilityRank(currentVol: number, historicalReturns: number[]): number {
    const historicalVols = [];
    const windowSize = 30;
    
    for (let i = windowSize; i < historicalReturns.length; i++) {
      const windowReturns = historicalReturns.slice(i - windowSize, i);
      historicalVols.push(this.calculateHistoricalVolatility(windowReturns));
    }
    
    if (historicalVols.length === 0) return 50;
    
    const rank = historicalVols.filter(vol => vol < currentVol).length / historicalVols.length;
    return Math.round(rank * 100);
  }

  // Public API methods
  getCompressionRules(): DataCompressionRule[] {
    return Array.from(this.compressionRules.values());
  }

  getActiveJobs(): CompressionJob[] {
    return Array.from(this.activeJobs.values());
  }

  getCompressionStats(): { totalJobs: number; completedJobs: number; failedJobs: number; queueLength: number } {
    const allJobs = Array.from(this.activeJobs.values());
    return {
      totalJobs: allJobs.length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      queueLength: this.compressionQueue.length
    };
  }

  updateCompressionRule(dataType: string, rule: Partial<DataCompressionRule>) {
    const existingRule = this.compressionRules.get(dataType);
    if (existingRule) {
      this.compressionRules.set(dataType, { ...existingRule, ...rule });
      logService.log('info', 'Compression rule updated', { dataType, rule });
    }
  }
}

export const dataCompression = new DataCompressionService();