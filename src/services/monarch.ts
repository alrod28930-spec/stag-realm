import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid } from './bid';
import { recorder } from './recorder';
import { 
  TradeIntent, 
  GovernanceDecision, 
  RiskParameters, 
  RiskAlert, 
  MonarchContext,
  TradeModification 
} from '../types/governance';

// Monarch - Strategic Portfolio-wide Risk Governor
export class Monarch {
  private riskParameters: RiskParameters;
  private context: MonarchContext | null = null;
  private isActive = true;
  private lastPortfolioCheck = new Date();
  private interventionCount = 0;

  constructor() {
    // Initialize default risk parameters
    this.riskParameters = {
      maxPositionSize: 50000, // $50k max per position
      maxPositionPercent: 15, // 15% max per position
      minStockPrice: 5, // No penny stocks under $5
      minCapitalAllocation: 500, // Minimum $500 per trade
      maxPortfolioExposure: 95, // 95% max invested
      maxSectorExposure: 30, // 30% max per sector
      maxSingleStockExposure: 15, // 15% max per stock
      maxDailyDrawdown: 5, // 5% daily loss limit
      maxWeeklyDrawdown: 10, // 10% weekly loss limit
      maxTradesPerDay: 20,
      maxTradesPerBot: 5,
      maxLeverage: 1.5,
      maxPortfolioVolatility: 0.25, // 25% max volatility
      minSharpeRatio: 0.5,
      maxConcentrationRisk: 0.4,
      respectOracleAlerts: true,
      oracleAlertThreshold: 'medium',
      lastUpdated: new Date()
    };

    this.initialize();
  }

  private initialize(): void {
    // Listen for trade intents
    eventBus.on('trade.intent', (intent: TradeIntent) => {
      this.evaluateTradeIntent(intent).catch(error => {
        logService.log('error', 'Monarch trade evaluation failed', { error });
      });
    });

    // Listen for portfolio updates
    eventBus.on('bid.portfolio_updated', () => {
      this.updateContext().catch(error => {
        logService.log('error', 'Monarch context update failed', { error });
      });
    });

    // Listen for Oracle alerts
    eventBus.on('bid.oracle_alert_added', (alert: any) => {
      this.handleOracleAlert(alert).catch(error => {
        logService.log('error', 'Monarch Oracle alert handling failed', { error });
      });
    });

    // Continuous monitoring
    setInterval(() => {
      this.performContinuousScanning().catch(error => {
        logService.log('error', 'Monarch continuous scanning failed', { error });
      });
    }, 30000); // Every 30 seconds

    logService.log('info', 'Monarch risk governor initialized');
  }

  // Evaluate incoming trade intent
  private async evaluateTradeIntent(intent: TradeIntent): Promise<void> {
    const startTime = Date.now();
    
    try {
      logService.log('debug', 'Monarch evaluating trade intent', {
        intentId: intent.id,
        symbol: intent.symbol,
        botId: intent.botId
      });

      // Update context for current evaluation
      await this.updateContext();

      // Perform risk checks
      const decision = await this.makeGovernanceDecision(intent);
      
      // Record decision
      await recorder.recordGovernanceDecisionNew(decision);
      
      // Emit decision
      eventBus.emit('governance.decision', decision);
      
      // Handle based on decision
      if (decision.action === 'hard_pull') {
        await this.executeHardPull(intent, decision);
      } else if (decision.action === 'soft_pull') {
        await this.executeSoftPull(intent, decision);
      } else {
        // Approve trade
        eventBus.emit('trade.approved', {
          ...intent,
          governanceId: decision.id,
          modifications: decision.modifications || []
        });
      }

      this.interventionCount++;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'Monarch trade evaluation error', { 
        error: errorMessage,
        intentId: intent.id 
      });

      // Default to hard pull on error for safety
      await this.executeHardPull(intent, {
        id: `monarch_error_${Date.now()}`,
        tradeIntentId: intent.id,
        governor: 'monarch',
        action: 'hard_pull',
        reasoning: `System error during evaluation: ${errorMessage}`,
        modifications: [],
        riskFactors: ['system_error'],
        confidence: 1.0,
        processingTimeMs: Date.now() - startTime,
        createdAt: new Date()
      });
    }
  }

  // Make governance decision based on risk analysis
  private async makeGovernanceDecision(intent: TradeIntent): Promise<GovernanceDecision> {
    const startTime = Date.now();
    const riskFactors: string[] = [];
    const modifications: TradeModification[] = [];
    let action: 'approve' | 'soft_pull' | 'hard_pull' = 'approve';
    let reasoning = 'Trade approved - no significant risks detected';

    // Check portfolio-level constraints
    const portfolio = bid.getPortfolio();
    const riskMetrics = bid.getRiskMetrics();
    
    if (!portfolio || !riskMetrics) {
      action = 'hard_pull';
      reasoning = 'No portfolio data available - cannot assess risk';
      riskFactors.push('missing_portfolio_data');
    } else {
      // 1. Check daily drawdown
      if (portfolio.dayChangePercent < -this.riskParameters.maxDailyDrawdown) {
        action = 'hard_pull';
        reasoning = `Daily drawdown limit breached: ${portfolio.dayChangePercent.toFixed(2)}%`;
        riskFactors.push('daily_drawdown_breach');
      }

      // 2. Check position size limits
      const positionValue = intent.quantity * (intent.price || 100); // Estimate if no price
      if (positionValue > this.riskParameters.maxPositionSize) {
        action = 'soft_pull';
        reasoning = 'Position size exceeds limit - reducing quantity';
        riskFactors.push('oversized_position');
        
        const maxQuantity = Math.floor(this.riskParameters.maxPositionSize / (intent.price || 100));
        modifications.push({
          field: 'quantity',
          originalValue: intent.quantity,
          newValue: maxQuantity,
          reason: 'Reduced to meet position size limit'
        });
      }

      // 3. Check sector exposure
      const existingPosition = portfolio.positions.find(p => p.symbol === intent.symbol);
      const currentExposure = existingPosition?.allocation || 0;
      const newExposure = (positionValue / portfolio.totalEquity) * 100;
      
      if (currentExposure + newExposure > this.riskParameters.maxSingleStockExposure) {
        action = 'soft_pull';
        reasoning = `Single stock exposure would exceed ${this.riskParameters.maxSingleStockExposure}%`;
        riskFactors.push('concentration_risk');
      }

      // 4. Check concentration risk
      if (riskMetrics.concentrationRisk > this.riskParameters.maxConcentrationRisk) {
        action = 'soft_pull';
        reasoning = 'Portfolio concentration risk too high';
        riskFactors.push('high_concentration');
      }

      // 5. Check Oracle alerts
      if (this.riskParameters.respectOracleAlerts) {
        const oracleAlerts = bid.getOracleAlerts(5);
        const relevantAlerts = oracleAlerts.filter(alert => 
          alert.affectedSymbols.includes(intent.symbol) &&
          this.shouldRespectOracleAlert(alert.severity)
        );

        if (relevantAlerts.length > 0) {
          const highestSeverity = relevantAlerts.reduce((max, alert) => 
            this.getAlertSeverityScore(alert.severity) > this.getAlertSeverityScore(max.severity) ? alert : max
          );

          if (highestSeverity.severity === 'critical') {
            action = 'hard_pull';
            reasoning = `Critical Oracle alert: ${highestSeverity.title}`;
            riskFactors.push('oracle_critical_alert');
          } else {
            action = 'soft_pull';
            reasoning = `Oracle alert requires caution: ${highestSeverity.title}`;
            riskFactors.push('oracle_warning');
          }
        }
      }

      // 6. Check minimum stock price
      const currentPrice = intent.price || 0;
      if (currentPrice > 0 && currentPrice < this.riskParameters.minStockPrice) {
        action = 'hard_pull';
        reasoning = `Stock price $${currentPrice} below minimum $${this.riskParameters.minStockPrice}`;
        riskFactors.push('penny_stock');
      }
    }

    return {
      id: `monarch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tradeIntentId: intent.id,
      governor: 'monarch',
      action,
      reasoning,
      modifications,
      riskFactors,
      confidence: this.calculateDecisionConfidence(riskFactors),
      processingTimeMs: Date.now() - startTime,
      createdAt: new Date()
    };
  }

  // Execute hard pull - prevent trade execution
  private async executeHardPull(intent: TradeIntent, decision: GovernanceDecision): Promise<void> {
    logService.log('warn', 'Monarch executing hard pull', {
      intentId: intent.id,
      symbol: intent.symbol,
      reasoning: decision.reasoning
    });

    // Generate critical alert
    const alert: RiskAlert = {
      id: `monarch_hard_pull_${Date.now()}`,
      type: 'hard_pull',
      severity: 'critical',
      title: 'Trade Blocked by Risk Control',
      message: `${intent.symbol} trade blocked: ${decision.reasoning}`,
      symbol: intent.symbol,
      currentValue: 0,
      thresholdValue: 0,
      recommendedAction: 'Review risk parameters and market conditions',
      governor: 'monarch',
      acknowledged: false,
      createdAt: new Date()
    };

    // Emit blocked trade event
    eventBus.emit('trade.blocked', {
      intent,
      decision,
      alert
    });

    // Record alert
    await recorder.recordRiskAlert(alert);
    
    logService.log('info', 'Trade blocked by Monarch', {
      symbol: intent.symbol,
      botId: intent.botId,
      reason: decision.reasoning
    });
  }

  // Execute soft pull - modify trade parameters
  private async executeSoftPull(intent: TradeIntent, decision: GovernanceDecision): Promise<void> {
    logService.log('warn', 'Monarch executing soft pull', {
      intentId: intent.id,
      symbol: intent.symbol,
      modifications: decision.modifications?.length || 0
    });

    // Apply modifications to trade intent
    let modifiedIntent = { ...intent };
    decision.modifications?.forEach(mod => {
      (modifiedIntent as any)[mod.field] = mod.newValue;
    });

    // Generate warning alert
    const alert: RiskAlert = {
      id: `monarch_soft_pull_${Date.now()}`,
      type: 'soft_pull',
      severity: 'medium',
      title: 'Trade Modified by Risk Control',
      message: `${intent.symbol} trade modified: ${decision.reasoning}`,
      symbol: intent.symbol,
      currentValue: 0,
      thresholdValue: 0,
      recommendedAction: 'Monitor position closely',
      governor: 'monarch',
      acknowledged: false,
      createdAt: new Date()
    };

    // Emit modified trade event
    eventBus.emit('trade.modified', {
      originalIntent: intent,
      modifiedIntent,
      decision,
      alert
    });

    // Record alert
    await recorder.recordRiskAlert(alert);
    
    logService.log('info', 'Trade modified by Monarch', {
      symbol: intent.symbol,
      modifications: decision.modifications
    });
  }

  // Continuous portfolio monitoring
  private async performContinuousScanning(): Promise<void> {
    if (!this.isActive) return;

    try {
      await this.updateContext();
      
      if (!this.context) return;

      // Check for threshold breaches
      const alerts: RiskAlert[] = [];

      // Daily drawdown check
      if (this.context.dailyDrawdown < -this.riskParameters.maxDailyDrawdown) {
        alerts.push({
          id: `monarch_breach_${Date.now()}`,
          type: 'threshold_breach',
          severity: 'critical',
          title: 'Daily Drawdown Limit Breached',
          message: `Portfolio down ${Math.abs(this.context.dailyDrawdown).toFixed(2)}% today`,
          currentValue: Math.abs(this.context.dailyDrawdown),
          thresholdValue: this.riskParameters.maxDailyDrawdown,
          recommendedAction: 'Consider halting new trades and reviewing positions',
          governor: 'monarch',
          acknowledged: false,
          createdAt: new Date()
        });
      }

      // Concentration risk check
      if (this.context.concentrationRisk > this.riskParameters.maxConcentrationRisk) {
        alerts.push({
          id: `monarch_concentration_${Date.now()}`,
          type: 'threshold_breach',
          severity: 'high',
          title: 'High Portfolio Concentration',
          message: `Concentration risk: ${(this.context.concentrationRisk * 100).toFixed(1)}%`,
          currentValue: this.context.concentrationRisk,
          thresholdValue: this.riskParameters.maxConcentrationRisk,
          recommendedAction: 'Consider diversifying holdings',
          governor: 'monarch',
          acknowledged: false,
          createdAt: new Date()
        });
      }

      // Process and emit alerts
      for (const alert of alerts) {
        await recorder.recordRiskAlert(alert);
        eventBus.emit('risk.alert', alert);
      }

      this.lastPortfolioCheck = new Date();
      
    } catch (error) {
      logService.log('error', 'Monarch continuous scanning error', { error });
    }
  }

  // Update Monarch context from BID
  private async updateContext(): Promise<void> {
    const portfolio = bid.getPortfolio();
    const riskMetrics = bid.getRiskMetrics();
    
    if (!portfolio || !riskMetrics) return;

    // Calculate sector exposures
    const sectorExposures: Record<string, number> = {};
    portfolio.positions.forEach(pos => {
      const sector = 'Unknown'; // Would be determined from symbol lookup
      sectorExposures[sector] = (sectorExposures[sector] || 0) + pos.allocation;
    });

    // Get top positions
    const topPositions = portfolio.positions
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 5)
      .map(pos => ({
        symbol: pos.symbol,
        exposure: pos.allocation
      }));

    this.context = {
      portfolioValue: portfolio.totalEquity,
      availableCash: portfolio.availableCash,
      currentDrawdown: portfolio.totalUnrealizedPnLPercent,
      dailyDrawdown: portfolio.dayChangePercent,
      weeklyDrawdown: portfolio.dayChangePercent * 5, // Mock weekly
      sectorExposures,
      topPositions,
      volatility: riskMetrics.volatility,
      concentrationRisk: riskMetrics.concentrationRisk,
      activeBots: 3, // Mock - would track active bots
      lastUpdated: new Date()
    };
  }

  // Handle Oracle alerts
  private async handleOracleAlert(alert: any): Promise<void> {
    if (!this.riskParameters.respectOracleAlerts) return;
    
    if (!this.shouldRespectOracleAlert(alert.severity)) return;

    logService.log('info', 'Monarch processing Oracle alert', {
      alertId: alert.id,
      severity: alert.severity,
      type: alert.type
    });

    // Generate risk alert based on Oracle signal
    const riskAlert: RiskAlert = {
      id: `monarch_oracle_${Date.now()}`,
      type: 'oracle_warning',
      severity: alert.severity,
      title: `Oracle Risk Alert: ${alert.title}`,
      message: alert.message,
      symbol: alert.affectedSymbols?.[0],
      sector: alert.affectedSectors?.[0],
      currentValue: 0,
      thresholdValue: 0,
      recommendedAction: alert.actionRequired ? 'Immediate action required' : 'Monitor closely',
      governor: 'monarch',
      acknowledged: false,
      createdAt: new Date()
    };

    await recorder.recordRiskAlert(riskAlert);
    eventBus.emit('risk.alert', riskAlert);
  }

  // Helper methods
  private shouldRespectOracleAlert(severity: string): boolean {
    const severityScore = this.getAlertSeverityScore(severity);
    const thresholdScore = this.getAlertSeverityScore(this.riskParameters.oracleAlertThreshold);
    return severityScore >= thresholdScore;
  }

  private getAlertSeverityScore(severity: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[severity as keyof typeof scores] || 0;
  }

  private calculateDecisionConfidence(riskFactors: string[]): number {
    // Higher confidence with more risk factors
    const baseConfidence = 0.7;
    const factorBonus = Math.min(riskFactors.length * 0.1, 0.3);
    return Math.min(baseConfidence + factorBonus, 1.0);
  }

  // Public methods
  updateRiskParameters(params: Partial<RiskParameters>): void {
    this.riskParameters = {
      ...this.riskParameters,
      ...params,
      lastUpdated: new Date()
    };
    
    logService.log('info', 'Monarch risk parameters updated', params);
    eventBus.emit('governance.parameters_updated', this.riskParameters);
  }

  getRiskParameters(): RiskParameters {
    return { ...this.riskParameters };
  }

  getContext(): MonarchContext | null {
    return this.context;
  }

  activate(): void {
    this.isActive = true;
    logService.log('info', 'Monarch activated');
  }

  deactivate(): void {
    this.isActive = false;
    logService.log('warn', 'Monarch deactivated - risk monitoring disabled');
  }

  getMetrics() {
    return {
      interventionCount: this.interventionCount,
      lastCheck: this.lastPortfolioCheck,
      isActive: this.isActive,
      parametersLastUpdated: this.riskParameters.lastUpdated
    };
  }
}

// Export singleton
export const monarch = new Monarch();