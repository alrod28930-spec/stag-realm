import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid } from './bid';
import { recorder } from './recorder';
import { 
  TradeIntent, 
  GovernanceDecision, 
  RiskAlert, 
  OverseerContext,
  CollapseSignal,
  CollapseFactors,
  TradeModification 
} from '../types/governance';

// Overseer - Tactical Position-level Risk Governor
export class Overseer {
  private contexts: Map<string, OverseerContext> = new Map();
  private collapseSignals: Map<string, CollapseSignal> = new Map();
  private isActive = true;
  private interventionCount = 0;
  private lastScanTime = new Date();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for trade intents (after Monarch)
    eventBus.on('trade.approved', (approvedTrade: any) => {
      this.evaluateApprovedTrade(approvedTrade).catch(error => {
        logService.log('error', 'Overseer trade evaluation failed', { error });
      });
    });

    // Listen for Oracle signals for collapse detection
    eventBus.on('bid.oracle_signal_added', (signal: any) => {
      this.updateCollapseSignals(signal).catch(error => {
        logService.log('error', 'Overseer collapse signal update failed', { error });
      });
    });

    // Listen for market data updates
    eventBus.on('repository.market_data_cleaned', (marketData: any[]) => {
      this.updateContexts(marketData).catch(error => {
        logService.log('error', 'Overseer context update failed', { error });
      });
    });

    // Position-level monitoring
    setInterval(() => {
      this.performPositionScanning().catch(error => {
        logService.log('error', 'Overseer position scanning failed', { error });
      });
    }, 15000); // Every 15 seconds - more frequent than Monarch

    logService.log('info', 'Overseer position governor initialized');
  }

  // Evaluate trade that was approved by Monarch
  private async evaluateApprovedTrade(approvedTrade: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logService.log('debug', 'Overseer evaluating approved trade', {
        symbol: approvedTrade.symbol,
        governanceId: approvedTrade.governanceId
      });

      // Update context for this symbol
      await this.updateContextForSymbol(approvedTrade.symbol);

      // Perform position-level risk checks
      const decision = await this.makePositionDecision(approvedTrade);
      
      // Record decision
      await recorder.recordGovernanceDecisionNew(decision);
      
      // Emit decision
      eventBus.emit('governance.decision', decision);
      
      // Handle based on decision
      if (decision.action === 'hard_pull') {
        await this.executePositionHardPull(approvedTrade, decision);
      } else if (decision.action === 'soft_pull') {
        await this.executePositionSoftPull(approvedTrade, decision);
      } else {
        // Final approval - send to broker
        eventBus.emit('trade.final_approval', {
          ...approvedTrade,
          overseerDecision: decision
        });
      }

      this.interventionCount++;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'Overseer trade evaluation error', { 
        error: errorMessage,
        symbol: approvedTrade.symbol 
      });

      // Default to hard pull on error
      await this.executePositionHardPull(approvedTrade, {
        id: `overseer_error_${Date.now()}`,
        tradeIntentId: approvedTrade.id,
        governor: 'overseer',
        action: 'hard_pull',
        reasoning: `System error during position evaluation: ${errorMessage}`,
        modifications: [],
        riskFactors: ['system_error'],
        confidence: 1.0,
        processingTimeMs: Date.now() - startTime,
        createdAt: new Date()
      });
    }
  }

  // Make position-level governance decision
  private async makePositionDecision(trade: any): Promise<GovernanceDecision> {
    const startTime = Date.now();
    const riskFactors: string[] = [];
    const modifications: TradeModification[] = [];
    let action: 'approve' | 'soft_pull' | 'hard_pull' = 'approve';
    let reasoning = 'Position-level checks passed';

    const context = this.contexts.get(trade.symbol);
    const collapseSignal = this.collapseSignals.get(trade.symbol);

    // 1. Check for collapse signals
    if (collapseSignal && collapseSignal.recommendation === 'exit_immediately') {
      action = 'hard_pull';
      reasoning = `Collapse detected - score: ${collapseSignal.collapseScore.toFixed(2)}`;
      riskFactors.push('collapse_imminent');
    } else if (collapseSignal && collapseSignal.recommendation === 'reduce_exposure') {
      action = 'soft_pull';
      reasoning = 'Collapse risk detected - reducing position size';
      riskFactors.push('collapse_risk');
      
      // Reduce quantity by 50%
      modifications.push({
        field: 'quantity',
        originalValue: trade.quantity,
        newValue: Math.floor(trade.quantity * 0.5),
        reason: 'Reduced due to collapse risk'
      });
    }

    // 2. Check liquidity and spreads
    if (context) {
      // Abnormal spreads check
      if (context.bidAskSpread > 0.05) { // 5% spread threshold
        action = action === 'approve' ? 'soft_pull' : action;
        reasoning = `Wide bid-ask spread: ${(context.bidAskSpread * 100).toFixed(2)}%`;
        riskFactors.push('wide_spreads');
      }

      // Low volume check
      const volumeRatio = context.currentVolume / context.averageDailyVolume;
      if (volumeRatio < 0.3) { // Less than 30% of average volume
        action = action === 'approve' ? 'soft_pull' : action;
        reasoning = `Low volume: ${(volumeRatio * 100).toFixed(1)}% of average`;
        riskFactors.push('low_liquidity');
        
        // Reduce quantity for illiquid conditions
        modifications.push({
          field: 'quantity',
          originalValue: trade.quantity,
          newValue: Math.floor(trade.quantity * 0.7),
          reason: 'Reduced due to low liquidity'
        });
      }

      // High volatility check
      if (context.priceVolatility > 0.5) { // 50% volatility threshold
        action = action === 'approve' ? 'soft_pull' : action;
        reasoning = `High volatility: ${(context.priceVolatility * 100).toFixed(1)}%`;
        riskFactors.push('high_volatility');
        
        // Tighten stop loss for volatile stocks
        if (trade.stopLoss) {
          const tighterStopLoss = trade.side === 'buy' 
            ? trade.price * 0.98  // 2% stop loss for buy orders
            : trade.price * 1.02; // 2% stop loss for sell orders
            
          modifications.push({
            field: 'stopLoss',
            originalValue: trade.stopLoss,
            newValue: tighterStopLoss,
            reason: 'Tightened due to high volatility'
          });
        }
      }

      // Recent rapid trading check
      const recentTrades = context.recentTrades.filter(t => 
        Date.now() - t.timestamp.getTime() < 3600000 // Last hour
      );
      
      if (recentTrades.length > 3) {
        action = action === 'approve' ? 'soft_pull' : action;
        reasoning = `Excessive recent trading: ${recentTrades.length} trades in last hour`;
        riskFactors.push('overtrading');
      }

      // Oracle position-specific signals
      const criticalSignals = context.oracleSignals.filter(s => 
        s.severity === 'critical' && 
        Date.now() - s.timestamp.getTime() < 900000 // Last 15 minutes
      );
      
      if (criticalSignals.length > 0) {
        action = 'hard_pull';
        reasoning = `Critical Oracle signals detected for ${trade.symbol}`;
        riskFactors.push('oracle_critical_position');
      }
    }

    return {
      id: `overseer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tradeIntentId: trade.id,
      governor: 'overseer',
      action,
      reasoning,
      modifications,
      riskFactors,
      confidence: this.calculatePositionConfidence(riskFactors, context),
      processingTimeMs: Date.now() - startTime,
      createdAt: new Date()
    };
  }

  // Execute position-level hard pull
  private async executePositionHardPull(trade: any, decision: GovernanceDecision): Promise<void> {
    logService.log('warn', 'Overseer executing position hard pull', {
      symbol: trade.symbol,
      reasoning: decision.reasoning
    });

    const alert: RiskAlert = {
      id: `overseer_hard_pull_${Date.now()}`,
      type: 'hard_pull',
      severity: 'critical',
      title: 'Position Trade Blocked',
      message: `${trade.symbol} position trade blocked: ${decision.reasoning}`,
      symbol: trade.symbol,
      currentValue: 0,
      thresholdValue: 0,
      recommendedAction: 'Review position-specific risk factors',
      governor: 'overseer',
      acknowledged: false,
      createdAt: new Date()
    };

    eventBus.emit('trade.position_blocked', {
      trade,
      decision,
      alert
    });

    await recorder.recordRiskAlert(alert);
  }

  // Execute position-level soft pull
  private async executePositionSoftPull(trade: any, decision: GovernanceDecision): Promise<void> {
    logService.log('warn', 'Overseer executing position soft pull', {
      symbol: trade.symbol,
      modifications: decision.modifications?.length || 0
    });

    // Apply modifications
    let modifiedTrade = { ...trade };
    decision.modifications?.forEach(mod => {
      (modifiedTrade as any)[mod.field] = mod.newValue;
    });

    const alert: RiskAlert = {
      id: `overseer_soft_pull_${Date.now()}`,
      type: 'soft_pull',
      severity: 'medium',
      title: 'Position Trade Modified',
      message: `${trade.symbol} trade modified: ${decision.reasoning}`,
      symbol: trade.symbol,
      currentValue: 0,
      thresholdValue: 0,
      recommendedAction: 'Monitor position execution closely',
      governor: 'overseer',
      acknowledged: false,
      createdAt: new Date()
    };

    eventBus.emit('trade.position_modified', {
      originalTrade: trade,
      modifiedTrade,
      decision,
      alert
    });

    await recorder.recordRiskAlert(alert);
  }

  // Update collapse signals based on Oracle data
  private async updateCollapseSignals(signal: any): Promise<void> {
    if (!signal.symbol) return;

    const factors: CollapseFactors = {
      fundamentalDecline: this.extractFactorScore(signal, 'fundamental'),
      unusualVolume: this.extractFactorScore(signal, 'volume'),
      abnormalSpreads: this.extractFactorScore(signal, 'spread'),
      oracleRedFlags: signal.severity === 'critical' ? 0.9 : signal.severity === 'high' ? 0.7 : 0.3,
      newsNegativeSentiment: this.extractFactorScore(signal, 'sentiment'),
      technicalBreakdown: this.extractFactorScore(signal, 'technical')
    };

    // Calculate overall collapse score
    const weights = {
      fundamentalDecline: 0.25,
      unusualVolume: 0.15,
      abnormalSpreads: 0.15,
      oracleRedFlags: 0.20,
      newsNegativeSentiment: 0.15,
      technicalBreakdown: 0.10
    };

    const collapseScore = Object.entries(factors).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof typeof weights]);
    }, 0);

    // Determine recommendation
    let recommendation: CollapseSignal['recommendation'];
    if (collapseScore > 0.8) {
      recommendation = 'exit_immediately';
    } else if (collapseScore > 0.6) {
      recommendation = 'reduce_exposure';
    } else if (collapseScore > 0.4) {
      recommendation = 'monitor_closely';
    } else {
      recommendation = 'no_action';
    }

    const collapseSignal: CollapseSignal = {
      symbol: signal.symbol,
      collapseScore,
      factors,
      timeHorizon: '1d',
      confidence: signal.confidence || 0.7,
      recommendation,
      generatedAt: new Date()
    };

    this.collapseSignals.set(signal.symbol, collapseSignal);
    
    logService.log('debug', 'Collapse signal updated', {
      symbol: signal.symbol,
      score: collapseScore,
      recommendation
    });

    // Emit collapse signal if significant
    if (collapseScore > 0.6) {
      eventBus.emit('collapse.signal', collapseSignal);
    }
  }

  // Position scanning for existing holdings
  private async performPositionScanning(): Promise<void> {
    if (!this.isActive) return;

    try {
      const portfolio = bid.getPortfolio();
      if (!portfolio) return;

      const alerts: RiskAlert[] = [];

      // Scan each position for risks
      for (const position of portfolio.positions) {
        const context = this.contexts.get(position.symbol);
        const collapseSignal = this.collapseSignals.get(position.symbol);

        // Check for immediate collapse risk
        if (collapseSignal?.recommendation === 'exit_immediately') {
          alerts.push({
            id: `overseer_collapse_${Date.now()}_${position.symbol}`,
            type: 'threshold_breach',
            severity: 'critical',
            title: 'Position Collapse Risk',
            message: `${position.symbol} showing collapse signals - consider immediate exit`,
            symbol: position.symbol,
            currentValue: collapseSignal.collapseScore,
            thresholdValue: 0.8,
            recommendedAction: 'Exit position immediately',
            governor: 'overseer',
            acknowledged: false,
            createdAt: new Date()
          });
        }

        // Check for large unrealized losses
        if (position.unrealizedPnLPercent < -15) {
          alerts.push({
            id: `overseer_loss_${Date.now()}_${position.symbol}`,
            type: 'threshold_breach',
            severity: 'high',
            title: 'Large Position Loss',
            message: `${position.symbol} down ${Math.abs(position.unrealizedPnLPercent).toFixed(1)}%`,
            symbol: position.symbol,
            currentValue: Math.abs(position.unrealizedPnLPercent),
            thresholdValue: 15,
            recommendedAction: 'Review position and consider stop loss',
            governor: 'overseer',
            acknowledged: false,
            createdAt: new Date()
          });
        }
      }

      // Process alerts
      for (const alert of alerts) {
        await recorder.recordRiskAlert(alert);
        eventBus.emit('risk.alert', alert);
      }

      this.lastScanTime = new Date();
      
    } catch (error) {
      logService.log('error', 'Overseer position scanning error', { error });
    }
  }

  // Update context for specific symbol
  private async updateContextForSymbol(symbol: string): Promise<void> {
    const portfolio = bid.getPortfolio();
    const oracleSignals = bid.getOracleSignalsBySymbol(symbol, 5);
    
    // Mock position data (would come from real market data)
    const context: OverseerContext = {
      symbol,
      currentPosition: portfolio?.positions.find(p => p.symbol === symbol) ? {
        quantity: portfolio.positions.find(p => p.symbol === symbol)!.quantity,
        averagePrice: portfolio.positions.find(p => p.symbol === symbol)!.averagePrice,
        marketValue: portfolio.positions.find(p => p.symbol === symbol)!.marketValue,
        unrealizedPnL: portfolio.positions.find(p => p.symbol === symbol)!.unrealizedPnL
      } : undefined,
      recentTrades: [], // Would be populated from trade history
      priceVolatility: 0.2 + Math.random() * 0.3, // Mock 20-50% volatility
      averageDailyVolume: 1000000,
      currentVolume: 500000 + Math.random() * 1000000,
      bidAskSpread: 0.01 + Math.random() * 0.04, // 1-5% spread
      oracleSignals: oracleSignals.map(s => ({
        type: s.type,
        severity: s.severity,
        timestamp: s.timestamp
      })),
      lastUpdated: new Date()
    };

    this.contexts.set(symbol, context);
  }

  // Update contexts from market data
  private async updateContexts(marketData: any[]): Promise<void> {
    for (const data of marketData) {
      if (data.symbol && this.contexts.has(data.symbol)) {
        const context = this.contexts.get(data.symbol)!;
        
        // Update with real market data
        context.priceVolatility = data.volatility || context.priceVolatility;
        context.currentVolume = data.volume || context.currentVolume;
        context.bidAskSpread = data.spread || context.bidAskSpread;
        context.lastUpdated = new Date();
      }
    }
  }

  // Helper methods
  private extractFactorScore(signal: any, factorType: string): number {
    // Extract factor scores from Oracle signals
    if (signal.data && signal.data[factorType]) {
      return Math.min(signal.data[factorType], 1.0);
    }
    
    // Default scoring based on signal type and severity
    const severityScore = { low: 0.2, medium: 0.4, high: 0.7, critical: 0.9 };
    return severityScore[signal.severity as keyof typeof severityScore] || 0.3;
  }

  private calculatePositionConfidence(riskFactors: string[], context?: OverseerContext): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for each risk factor
    confidence -= riskFactors.length * 0.05;
    
    // Adjust based on data quality
    if (!context) confidence *= 0.7;
    
    return Math.max(confidence, 0.3);
  }

  // Public methods
  getContext(symbol: string): OverseerContext | undefined {
    return this.contexts.get(symbol);
  }

  getCollapseSignal(symbol: string): CollapseSignal | undefined {
    return this.collapseSignals.get(symbol);
  }

  getAllCollapseSignals(): CollapseSignal[] {
    return Array.from(this.collapseSignals.values());
  }

  activate(): void {
    this.isActive = true;
    logService.log('info', 'Overseer activated');
  }

  deactivate(): void {
    this.isActive = false;
    logService.log('warn', 'Overseer deactivated - position monitoring disabled');
  }

  getMetrics() {
    return {
      interventionCount: this.interventionCount,
      lastScan: this.lastScanTime,
      isActive: this.isActive,
      trackedPositions: this.contexts.size,
      collapseSignals: this.collapseSignals.size
    };
  }
}

// Export singleton
export const overseer = new Overseer();