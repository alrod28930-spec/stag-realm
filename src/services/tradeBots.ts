// Trade Bot System - Automated strategy modules with compliance safeguards

import { TradeBot, BotStatus, BotConfig, PreTradeJournal, BotResearchResult, BotMetrics, StrategyModule } from '@/types/tradeBots';
import { TradeIntent } from '@/types/governance';
import { eventBus } from './eventBus';
import { recorder } from './recorder';
import { repository } from './repository';
import { oracle } from './oracle';

class TradeBotSystem {
  private bots: Map<string, TradeBot> = new Map();
  private strategies: Map<string, StrategyModule> = new Map();
  private journalEntries: Map<string, PreTradeJournal> = new Map();
  private isMarketOpen = false;
  private researchInterval?: NodeJS.Timeout;
  private tradingInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeEventListeners();
    this.initializeStrategies();
    this.startMarketMonitoring();
  }

  private initializeEventListeners() {
    // Listen for market open/close
    eventBus.on('market.opened', () => {
      this.isMarketOpen = true;
      this.startLiveTrading();
    });

    eventBus.on('market.closed', () => {
      this.isMarketOpen = false;
      this.stopLiveTrading();
      this.startResearchMode();
    });

    // Listen for governance decisions
    eventBus.on('governance.decision', (decision: any) => {
      this.handleGovernanceDecision(decision);
    });

    // Listen for bot toggle changes
    eventBus.on('bot.status_changed', (event: any) => {
      this.updateBotStatus(event.botId, event.status);
    });
  }

  private initializeStrategies() {
    // Register available strategies
    this.strategies.set('momentum', new MomentumStrategy());
    this.strategies.set('breakout', new BreakoutStrategy());
    this.strategies.set('signal_stacking', new SignalStackingStrategy());
    this.strategies.set('volatility', new VolatilityStrategy());
  }

  private startMarketMonitoring() {
    // Check market status every minute
    setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      
      // Simple market hours check (9:30 AM - 4:00 PM EST weekdays)
      const shouldBeOpen = isWeekday && hour >= 9 && hour < 16;
      
      if (shouldBeOpen !== this.isMarketOpen) {
        if (shouldBeOpen) {
          eventBus.emit('market.opened', {});
        } else {
          eventBus.emit('market.closed', {});
        }
      }
    }, 60000);
  }

  private startLiveTrading() {
    console.log('Starting live trading mode for active bots');
    
    // Run live analysis every 30 seconds during market hours
    this.tradingInterval = setInterval(() => {
      this.runLiveAnalysis();
    }, 30000);
  }

  private stopLiveTrading() {
    console.log('Stopping live trading mode');
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = undefined;
    }
  }

  private startResearchMode() {
    console.log('Starting research mode for bots');
    
    // Run research simulations every 5 minutes after market close
    this.researchInterval = setInterval(() => {
      this.runResearchSimulations();
    }, 5 * 60 * 1000);
  }

  private async runLiveAnalysis() {
    const activeBots = Array.from(this.bots.values()).filter(
      bot => bot.status !== 'off' && bot.isActive
    );

    for (const bot of activeBots) {
      try {
        await this.performBotAnalysis(bot, 'live');
      } catch (error) {
        console.error(`Error in live analysis for bot ${bot.id}:`, error);
        // Use existing system event types
        console.error(`Live analysis failed for bot ${bot.name}:`, error);
      }
    }
  }

  private async runResearchSimulations() {
    const activeBots = Array.from(this.bots.values()).filter(
      bot => bot.status !== 'off'
    );

    for (const bot of activeBots) {
      try {
        await this.performBotAnalysis(bot, 'research');
      } catch (error) {
        console.error(`Error in research simulation for bot ${bot.id}:`, error);
        // Use existing system event types
        console.error(`Research simulation failed for bot ${bot.name}:`, error);
      }
    }
  }

  private async performBotAnalysis(bot: TradeBot, mode: 'live' | 'research') {
    const strategy = this.strategies.get(bot.strategy);
    if (!strategy) {
      console.warn(`Strategy ${bot.strategy} not found for bot ${bot.id}`);
      return;
    }

    // Get watchlist or market symbols to analyze
    const symbols = await this.getSymbolsForBot(bot);
    
    // Perform research using the bot's strategy
    const results = await strategy.research(symbols, {
      mode,
      botConfig: bot.config,
      marketData: repository.getMarketData(),
      oracleSignals: oracle.getSignals()
    });

    // Process results and potentially generate trade intents
    for (const result of results) {
      if (result.confidence >= bot.config.minConfidenceThreshold) {
        await this.processResearchResult(bot, result, mode);
      }
    }

    // Update bot metrics
    this.updateBotMetrics(bot, results);
  }

  private async processResearchResult(bot: TradeBot, result: BotResearchResult, mode: 'live' | 'research') {
    // Create pre-trade journal entry
    const journalEntry = await this.createPreTradeJournal(bot, result);
    this.journalEntries.set(journalEntry.id, journalEntry);

    // Log bot research activity
    console.log(`Bot ${bot.name} identified opportunity in ${result.symbol} with ${(result.confidence * 100).toFixed(1)}% confidence`);

    // Generate trade intent if confidence is high enough and bot is in live mode
    if (mode === 'live' && bot.status === 'live' && result.confidence >= 0.7) {
      const strategy = this.strategies.get(bot.strategy);
      if (strategy) {
        const tradeIntent = await strategy.generateTradeIntent(result, bot);
        if (tradeIntent) {
          // Emit trade intent for governance review
          eventBus.emit('trade.intent', tradeIntent);
          
          // Update bot's daily trade count
          bot.dailyTradeCount++;
          bot.lastTradeAt = new Date();
        }
      }
    }

    // Emit research complete event
    eventBus.emit('bot.research_complete', {
      botId: bot.id,
      result,
      journalEntry,
      mode
    });
  }

  private async createPreTradeJournal(bot: TradeBot, result: BotResearchResult): Promise<PreTradeJournal> {
    return {
      id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      botId: bot.id,
      symbol: result.symbol,
      timestamp: new Date(),
      hypothesis: result.reasoning[0] || 'Algorithmic opportunity identified',
      supportingSignals: result.reasoning,
      riskMarkers: [`Max drawdown: ${bot.config.maxDrawdownPercent}%`],
      confidenceScore: result.confidence,
      oracleSignals: result.signals.map(s => ({
        type: s.type,
        strength: s.strength,
        source: s.source
      })),
      bidSignals: [],
      proposedAction: result.recommendation.includes('buy') ? 'buy' : 'sell',
      proposedQuantity: Math.floor(bot.config.maxPositionSize / 100), // Simplified quantity calculation
      expectedOutcome: `${result.recommendation} with ${(result.confidence * 100).toFixed(1)}% confidence`
    };
  }

  private async getSymbolsForBot(bot: TradeBot): Promise<string[]> {
    // Get symbols from various sources based on bot strategy
    const watchlistSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']; // Simplified
    const oracleSignals = oracle.getSignals(10);
    const oracleSymbols = oracleSignals.map(s => s.symbol).filter(Boolean);
    
    return [...new Set([...watchlistSymbols, ...oracleSymbols])];
  }

  private updateBotMetrics(bot: TradeBot, results: BotResearchResult[]) {
    bot.lastActive = new Date();
    
    // Update simple metrics
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // This would typically update more sophisticated metrics
    // For now, just mark as active
    this.bots.set(bot.id, bot);
  }

  private handleGovernanceDecision(decision: any) {
    // Handle governance decisions on trade intents from bots
    if (decision.action === 'approve') {
      console.log(`Trade approved for bot trade intent ${decision.tradeIntentId}`);
    } else {
      console.log(`Trade ${decision.action} for bot trade intent ${decision.tradeIntentId}: ${decision.reasoning}`);
    }
  }

  private updateBotStatus(botId: string, status: BotStatus) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = status;
      bot.isActive = status !== 'off';
      this.bots.set(botId, bot);
      
      // Log status change
      console.log(`Bot ${bot.name} status changed to ${status}`);
    }
  }

  // Public API methods
  public createBot(config: Partial<TradeBot> & Pick<TradeBot, 'name' | 'strategy'>): TradeBot {
    const bot: TradeBot = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      strategy: config.strategy,
      status: 'off',
      allocation: config.allocation || 1000,
      riskTolerance: config.riskTolerance || 0.5,
      createdAt: new Date(),
      lastActive: new Date(),
      totalTrades: 0,
      winRate: 0,
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      averageHoldTime: 24,
      config: config.config || this.getDefaultBotConfig(),
      isActive: false,
      currentPositions: 0,
      dailyTradeCount: 0
    };

    this.bots.set(bot.id, bot);
    
    eventBus.emit('bot.created', { bot });
    console.log(`Created new bot: ${bot.name}`);
    
    return bot;
  }

  public getBots(): TradeBot[] {
    return Array.from(this.bots.values());
  }

  public getBot(id: string): TradeBot | undefined {
    return this.bots.get(id);
  }

  public updateBotConfig(botId: string, config: Partial<BotConfig>): boolean {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.config = { ...bot.config, ...config };
      this.bots.set(botId, bot);
      return true;
    }
    return false;
  }

  public deleteBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (bot) {
      // Make sure bot is stopped first
      if (bot.status !== 'off') {
        this.updateBotStatus(botId, 'off');
      }
      
      this.bots.delete(botId);
      console.log(`Deleted bot: ${bot.name}`);
      return true;
    }
    return false;
  }

  public getMetrics(): BotMetrics {
    const bots = Array.from(this.bots.values());
    const activeBots = bots.filter(b => b.status !== 'off');
    
    return {
      totalBots: bots.length,
      activeBots: activeBots.length,
      totalAllocation: bots.reduce((sum, b) => sum + b.allocation, 0),
      totalTradesDaily: bots.reduce((sum, b) => sum + b.dailyTradeCount, 0),
      averagePerformance: bots.reduce((sum, b) => sum + b.totalReturn, 0) / bots.length || 0,
      topPerformer: bots.sort((a, b) => b.totalReturn - a.totalReturn)[0]?.name || 'N/A',
      worstPerformer: bots.sort((a, b) => a.totalReturn - b.totalReturn)[0]?.name || 'N/A',
      systemUptime: 99.5, // Mock uptime
      lastUpdated: new Date()
    };
  }

  public getJournalEntries(botId?: string): PreTradeJournal[] {
    const entries = Array.from(this.journalEntries.values());
    return botId ? entries.filter(e => e.botId === botId) : entries;
  }

  private getDefaultBotConfig(): BotConfig {
    return {
      maxPositionSize: 1000,
      maxDailyTrades: 5,
      minConfidenceThreshold: 0.6,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      strategyParams: {},
      maxDrawdownPercent: 10,
      minStockPrice: 5,
      blacklistedSymbols: []
    };
  }
}

// Strategy implementations
class MomentumStrategy implements StrategyModule {
  name = 'momentum' as const;
  description = 'Trades based on price momentum and volume confirmation';
  riskLevel = 'medium' as const;

  async research(symbols: string[], context: any): Promise<BotResearchResult[]> {
    const results: BotResearchResult[] = [];
    
    for (const symbol of symbols) {
      // Simplified momentum analysis
      const momentum = Math.random(); // Mock momentum score
      const volume = Math.random(); // Mock volume score
      
      if (momentum > 0.6 && volume > 0.5) {
        results.push({
          symbol,
          signals: [
            {
              type: 'momentum',
              strength: momentum,
              direction: 'bullish',
              timeframe: '1d',
              description: `Strong upward momentum detected`,
              source: 'technical_analysis'
            }
          ],
          overallScore: (momentum + volume) / 2,
          recommendation: momentum > 0.8 ? 'strong_buy' : 'buy',
          confidence: momentum * 0.9,
          reasoning: [`Strong momentum: ${(momentum * 100).toFixed(1)}%`, `Volume confirmation: ${(volume * 100).toFixed(1)}%`],
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }

  async generateTradeIntent(result: BotResearchResult, bot: TradeBot): Promise<TradeIntent> {
    return {
      id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      botId: bot.id,
      symbol: result.symbol,
      side: result.recommendation.includes('buy') ? 'buy' : 'sell',
      quantity: Math.floor(bot.config.maxPositionSize / 100),
      orderType: 'market',
      timeInForce: 'day',
      strategy: bot.strategy,
      confidence: result.confidence,
      reasoning: result.reasoning.join('; '),
      stopLoss: bot.config.stopLossPercent,
      takeProfit: bot.config.takeProfitPercent,
      maxRisk: bot.config.maxPositionSize * (bot.config.stopLossPercent / 100),
      createdAt: new Date()
    };
  }

  updateParameters(performance: any): BotConfig['strategyParams'] {
    return {};
  }
}

class BreakoutStrategy implements StrategyModule {
  name = 'breakout' as const;
  description = 'Identifies and trades breakouts from consolidation patterns';
  riskLevel = 'high' as const;

  async research(symbols: string[], context: any): Promise<BotResearchResult[]> {
    // Simplified breakout detection
    return [];
  }

  async generateTradeIntent(result: BotResearchResult, bot: TradeBot): Promise<TradeIntent> {
    throw new Error('Not implemented');
  }

  updateParameters(performance: any): BotConfig['strategyParams'] {
    return {};
  }
}

class SignalStackingStrategy implements StrategyModule {
  name = 'signal_stacking' as const;
  description = 'Combines multiple signals for high-confidence trades';
  riskLevel = 'medium' as const;

  async research(symbols: string[], context: any): Promise<BotResearchResult[]> {
    // Simplified signal stacking
    return [];
  }

  async generateTradeIntent(result: BotResearchResult, bot: TradeBot): Promise<TradeIntent> {
    throw new Error('Not implemented');
  }

  updateParameters(performance: any): BotConfig['strategyParams'] {
    return {};
  }
}

class VolatilityStrategy implements StrategyModule {
  name = 'volatility' as const;
  description = 'Exploits volatility patterns and mean reversion';
  riskLevel = 'low' as const;

  async research(symbols: string[], context: any): Promise<BotResearchResult[]> {
    // Simplified volatility analysis
    return [];
  }

  async generateTradeIntent(result: BotResearchResult, bot: TradeBot): Promise<TradeIntent> {
    throw new Error('Not implemented');
  }

  updateParameters(performance: any): BotConfig['strategyParams'] {
    return {};
  }
}

// Export singleton instance
export const tradeBotSystem = new TradeBotSystem();