import { logService } from './logging';
import { eventBus } from './eventBus';
import { bid, BIDPortfolioSummary, BIDRiskMetrics } from './bid';
import { recorder } from './recorder';

// Governance interfaces
export interface TradeIntent {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopPrice?: number;
  estimatedValue: number;
  submittedBy: 'user' | 'bot';
  botName?: string;
  reasoning?: string;
  submittedAt: Date;
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  ruleType: 'risk' | 'position' | 'capital' | 'time' | 'symbol';
  conditions: Record<string, any>;
  actions: ('reject' | 'modify' | 'flag' | 'require_approval')[];
}

export interface GovernanceDecision {
  tradeIntentId: string;
  decision: 'approved' | 'rejected' | 'modified' | 'requires_approval';
  decidedBy: 'monarch' | 'overseer' | 'user';
  reason: string;
  appliedRules: string[];
  modifications?: Partial<TradeIntent>;
  timestamp: Date;
}

export interface RiskLimits {
  maxPositionSize: number; // Maximum position size as % of portfolio
  maxDailyTrades: number;
  maxDailyLoss: number; // Maximum daily loss in $
  maxPortfolioLoss: number; // Maximum total portfolio loss %
  minCashReserve: number; // Minimum cash reserve %
  blacklistedSymbols: string[];
  maxConcentrationRisk: number; // Maximum single position %
  stopLossPercentage: number; // Default stop loss %
  takeProfitPercentage: number; // Default take profit %
}

// Monarch - Primary risk governor focused on portfolio-level decisions
export class Monarch {
  private rules: GovernanceRule[] = [];
  private riskLimits: RiskLimits;
  private isActive: boolean = true;

  constructor() {
    this.riskLimits = this.getDefaultRiskLimits();
    this.initializeDefaultRules();
    
    // Listen for trade intents
    eventBus.on('trade.intent', (intent: TradeIntent) => {
      this.evaluateTradeIntent(intent);
    });
  }

  private getDefaultRiskLimits(): RiskLimits {
    return {
      maxPositionSize: 10, // 10% max position size
      maxDailyTrades: 50,
      maxDailyLoss: 5000, // $5000 max daily loss
      maxPortfolioLoss: 15, // 15% max portfolio loss
      minCashReserve: 10, // 10% min cash reserve
      blacklistedSymbols: [],
      maxConcentrationRisk: 25, // 25% max single position
      stopLossPercentage: 5, // 5% default stop loss
      takeProfitPercentage: 15 // 15% default take profit
    };
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'max_position_size',
        name: 'Maximum Position Size',
        description: 'Prevents positions from exceeding maximum portfolio percentage',
        enabled: true,
        priority: 1,
        ruleType: 'position',
        conditions: { maxPercentage: this.riskLimits.maxPositionSize },
        actions: ['reject']
      },
      {
        id: 'daily_loss_limit',
        name: 'Daily Loss Limit',
        description: 'Halts trading when daily loss limit is reached',
        enabled: true,
        priority: 1,
        ruleType: 'risk',
        conditions: { maxLoss: this.riskLimits.maxDailyLoss },
        actions: ['reject']
      },
      {
        id: 'cash_reserve',
        name: 'Minimum Cash Reserve',
        description: 'Maintains minimum cash reserve percentage',
        enabled: true,
        priority: 2,
        ruleType: 'capital',
        conditions: { minPercentage: this.riskLimits.minCashReserve },
        actions: ['modify']
      },
      {
        id: 'blacklisted_symbols',
        name: 'Blacklisted Symbols',
        description: 'Prevents trading of blacklisted symbols',
        enabled: true,
        priority: 1,
        ruleType: 'symbol',
        conditions: { blacklist: this.riskLimits.blacklistedSymbols },
        actions: ['reject']
      },
      {
        id: 'large_trade_approval',
        name: 'Large Trade Approval',
        description: 'Requires approval for trades over $10,000',
        enabled: true,
        priority: 3,
        ruleType: 'capital',
        conditions: { minValue: 10000 },
        actions: ['require_approval']
      }
    ];
  }

  async evaluateTradeIntent(intent: TradeIntent): Promise<GovernanceDecision> {
    logService.log('info', 'Monarch evaluating trade intent', { 
      id: intent.id, 
      symbol: intent.symbol, 
      side: intent.side 
    });

    if (!this.isActive) {
      const decision: GovernanceDecision = {
        tradeIntentId: intent.id,
        decision: 'rejected',
        decidedBy: 'monarch',
        reason: 'Monarch is currently inactive',
        appliedRules: [],
        timestamp: new Date()
      };
      
      eventBus.emit('trade.governance_decision', decision);
      return decision;
    }

    const portfolio = bid.getPortfolio();
    const riskMetrics = bid.getRiskMetrics();
    
    const appliedRules: string[] = [];
    let decision: GovernanceDecision['decision'] = 'approved';
    let reason = 'Trade approved by Monarch';
    let modifications: Partial<TradeIntent> | undefined;

    // Evaluate each rule in priority order
    const sortedRules = this.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const ruleResult = await this.evaluateRule(rule, intent, portfolio, riskMetrics);
      
      if (ruleResult.triggered) {
        appliedRules.push(rule.id);
        
        if (rule.actions.includes('reject')) {
          decision = 'rejected';
          reason = ruleResult.reason;
          break;
        } else if (rule.actions.includes('require_approval')) {
          decision = 'requires_approval';
          reason = ruleResult.reason;
        } else if (rule.actions.includes('modify') && ruleResult.modifications) {
          decision = 'modified';
          reason = ruleResult.reason;
          modifications = { ...modifications, ...ruleResult.modifications };
        } else if (rule.actions.includes('flag')) {
          // Create alert but continue processing
          eventBus.emit('bid.alerts_generated', [{
            id: `flag_${intent.id}_${rule.id}`,
            type: 'risk',
            severity: 'medium',
            title: 'Trade Flagged by Governance',
            message: ruleResult.reason,
            symbol: intent.symbol,
            acknowledged: false,
            createdAt: new Date()
          }]);
        }
      }
    }

    const finalDecision: GovernanceDecision = {
      tradeIntentId: intent.id,
      decision,
      decidedBy: 'monarch',
      reason,
      appliedRules,
      modifications,
      timestamp: new Date()
    };

    // Record decision
    recorder.recordGovernanceDecision({
      tradeIntentId: intent.id,
      approved: decision === 'approved' || decision === 'modified',
      approvedBy: 'monarch',
      reason
    });

    eventBus.emit('trade.governance_decision', finalDecision);
    
    logService.log('info', 'Monarch decision made', { 
      tradeId: intent.id, 
      decision, 
      rulesApplied: appliedRules.length 
    });

    return finalDecision;
  }

  private async evaluateRule(
    rule: GovernanceRule, 
    intent: TradeIntent,
    portfolio: BIDPortfolioSummary | null,
    riskMetrics: BIDRiskMetrics | null
  ): Promise<{ triggered: boolean; reason: string; modifications?: Partial<TradeIntent> }> {
    
    switch (rule.id) {
      case 'max_position_size':
        return this.evaluateMaxPositionSize(rule, intent, portfolio);
      
      case 'daily_loss_limit':
        return this.evaluateDailyLossLimit(rule, intent, portfolio);
      
      case 'cash_reserve':
        return this.evaluateCashReserve(rule, intent, portfolio);
      
      case 'blacklisted_symbols':
        return this.evaluateBlacklist(rule, intent);
      
      case 'large_trade_approval':
        return this.evaluateLargeTradeApproval(rule, intent);
      
      default:
        return { triggered: false, reason: '' };
    }
  }

  private evaluateMaxPositionSize(
    rule: GovernanceRule, 
    intent: TradeIntent, 
    portfolio: BIDPortfolioSummary | null
  ): { triggered: boolean; reason: string } {
    if (!portfolio) return { triggered: false, reason: '' };

    const maxPercentage = rule.conditions.maxPercentage;
    const intentValue = intent.estimatedValue;
    const portfolioValue = portfolio.totalEquity;
    
    // Find existing position
    const existingPosition = portfolio.positions.find(p => p.symbol === intent.symbol);
    const currentPositionValue = existingPosition?.marketValue || 0;
    
    let newPositionValue = currentPositionValue;
    if (intent.side === 'buy') {
      newPositionValue += intentValue;
    } else {
      newPositionValue = Math.max(0, newPositionValue - intentValue);
    }
    
    const newPositionPercentage = (newPositionValue / portfolioValue) * 100;
    
    if (newPositionPercentage > maxPercentage) {
      return {
        triggered: true,
        reason: `Position would exceed maximum size of ${maxPercentage}% (would be ${newPositionPercentage.toFixed(1)}%)`
      };
    }
    
    return { triggered: false, reason: '' };
  }

  private evaluateDailyLossLimit(
    rule: GovernanceRule, 
    intent: TradeIntent, 
    portfolio: BIDPortfolioSummary | null
  ): { triggered: boolean; reason: string } {
    if (!portfolio) return { triggered: false, reason: '' };

    const maxLoss = rule.conditions.maxLoss;
    const currentDayChange = portfolio.dayChange;
    
    // Estimate potential additional loss from this trade (simplified)
    const potentialLoss = intent.side === 'sell' ? 0 : intent.estimatedValue * 0.05; // Assume 5% risk
    
    if (currentDayChange < 0 && Math.abs(currentDayChange) + potentialLoss > maxLoss) {
      return {
        triggered: true,
        reason: `Trade would exceed daily loss limit of $${maxLoss.toLocaleString()}`
      };
    }
    
    return { triggered: false, reason: '' };
  }

  private evaluateCashReserve(
    rule: GovernanceRule, 
    intent: TradeIntent, 
    portfolio: BIDPortfolioSummary | null
  ): { triggered: boolean; reason: string; modifications?: Partial<TradeIntent> } {
    if (!portfolio || intent.side !== 'buy') return { triggered: false, reason: '' };

    const minPercentage = rule.conditions.minPercentage;
    const requiredCash = portfolio.totalEquity * (minPercentage / 100);
    const availableForTrading = portfolio.availableCash - requiredCash;
    
    if (intent.estimatedValue > availableForTrading) {
      const maxTradeValue = Math.max(0, availableForTrading);
      const maxQuantity = Math.floor(maxTradeValue / (intent.price || 0));
      
      if (maxQuantity === 0) {
        return {
          triggered: true,
          reason: `Insufficient cash to maintain ${minPercentage}% reserve`
        };
      }
      
      return {
        triggered: true,
        reason: `Trade modified to maintain ${minPercentage}% cash reserve`,
        modifications: {
          quantity: maxQuantity,
          estimatedValue: maxQuantity * (intent.price || 0)
        }
      };
    }
    
    return { triggered: false, reason: '' };
  }

  private evaluateBlacklist(
    rule: GovernanceRule, 
    intent: TradeIntent
  ): { triggered: boolean; reason: string } {
    const blacklist = rule.conditions.blacklist as string[];
    
    if (blacklist.includes(intent.symbol)) {
      return {
        triggered: true,
        reason: `Symbol ${intent.symbol} is blacklisted`
      };
    }
    
    return { triggered: false, reason: '' };
  }

  private evaluateLargeTradeApproval(
    rule: GovernanceRule, 
    intent: TradeIntent
  ): { triggered: boolean; reason: string } {
    const minValue = rule.conditions.minValue;
    
    if (intent.estimatedValue >= minValue) {
      return {
        triggered: true,
        reason: `Large trade of $${intent.estimatedValue.toLocaleString()} requires approval`
      };
    }
    
    return { triggered: false, reason: '' };
  }

  // Public methods for managing Monarch
  setActive(active: boolean): void {
    this.isActive = active;
    logService.log('info', `Monarch ${active ? 'activated' : 'deactivated'}`);
    eventBus.emit('monarch.status_changed', { active });
  }

  updateRiskLimits(limits: Partial<RiskLimits>): void {
    const previous = { ...this.riskLimits };
    this.riskLimits = { ...this.riskLimits, ...limits };
    
    recorder.recordRiskAction('stop_loss_update', {
      reason: 'Risk limits updated by user',
      affectedSymbols: [],
      previousValues: previous,
      newValues: this.riskLimits,
      triggeredBy: 'user'
    });
    
    logService.log('info', 'Monarch risk limits updated', { limits });
    eventBus.emit('monarch.risk_limits_updated', this.riskLimits);
  }

  blacklistSymbol(symbol: string, reason: string): void {
    if (!this.riskLimits.blacklistedSymbols.includes(symbol)) {
      this.riskLimits.blacklistedSymbols.push(symbol);
      
      recorder.recordRiskAction('blacklist_symbol', {
        reason,
        affectedSymbols: [symbol],
        previousValues: {},
        newValues: { blacklisted: true },
        triggeredBy: 'monarch'
      });
      
      logService.log('info', 'Symbol blacklisted by Monarch', { symbol, reason });
      eventBus.emit('monarch.symbol_blacklisted', { symbol, reason });
    }
  }

  removeFromBlacklist(symbol: string): void {
    const index = this.riskLimits.blacklistedSymbols.indexOf(symbol);
    if (index !== -1) {
      this.riskLimits.blacklistedSymbols.splice(index, 1);
      logService.log('info', 'Symbol removed from blacklist', { symbol });
      eventBus.emit('monarch.symbol_unblacklisted', { symbol });
    }
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  getRules(): GovernanceRule[] {
    return [...this.rules];
  }

  isMonarchActive(): boolean {
    return this.isActive;
  }
}

// Overseer - Secondary governor focused on real-time monitoring and emergency stops
export class Overseer {
  private isActive: boolean = true;
  private emergencyMode: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5000);
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.isActive) return;

    const portfolio = bid.getPortfolio();
    const riskMetrics = bid.getRiskMetrics();
    
    if (!portfolio || !riskMetrics) return;

    // Check for emergency conditions
    const emergencyConditions = [
      {
        condition: portfolio.totalUnrealizedPnLPercent < -20,
        reason: 'Portfolio loss exceeds 20%',
        action: 'hard_pull'
      },
      {
        condition: riskMetrics.concentrationRisk > 0.6,
        reason: 'Extreme concentration risk detected',
        action: 'soft_pull'
      },
      {
        condition: portfolio.dayChangePercent < -10,
        reason: 'Daily loss exceeds 10%',
        action: 'soft_pull'
      }
    ];

    for (const emergency of emergencyConditions) {
      if (emergency.condition) {
        if (emergency.action === 'hard_pull') {
          await this.executeHardPull(emergency.reason);
        } else {
          await this.executeSoftPull(emergency.reason);
        }
        break; // Only execute one emergency action per check
      }
    }
  }

  private async executeSoftPull(reason: string): Promise<void> {
    logService.log('warn', 'Overseer executing soft pull', { reason });
    
    // Soft pull: Reduce position sizes, increase cash reserves
    const portfolio = bid.getPortfolio();
    if (!portfolio) return;

    recorder.recordRiskAction('soft_pull', {
      reason,
      affectedSymbols: portfolio.positions.map(p => p.symbol),
      previousValues: { emergencyMode: this.emergencyMode },
      newValues: { emergencyMode: true, riskReduction: 0.3 },
      triggeredBy: 'overseer'
    });

    eventBus.emit('risk.soft_pull', { reason, affectedSymbols: portfolio.positions.map(p => p.symbol) });
    
    // Generate alert
    eventBus.emit('bid.alerts_generated', [{
      id: `overseer_soft_pull_${Date.now()}`,
      type: 'risk',
      severity: 'high',
      title: 'Overseer Soft Pull Executed',
      message: reason,
      acknowledged: false,
      createdAt: new Date()
    }]);
  }

  private async executeHardPull(reason: string): Promise<void> {
    logService.log('error', 'Overseer executing hard pull', { reason });
    
    this.emergencyMode = true;
    
    const portfolio = bid.getPortfolio();
    const affectedSymbols = portfolio?.positions.map(p => p.symbol) || [];

    recorder.recordRiskAction('hard_pull', {
      reason,
      affectedSymbols,
      previousValues: { emergencyMode: false },
      newValues: { emergencyMode: true, allTradingHalted: true },
      triggeredBy: 'overseer'
    });

    eventBus.emit('risk.hard_pull', { reason, affectedSymbols });
    
    // Generate critical alert
    eventBus.emit('bid.alerts_generated', [{
      id: `overseer_hard_pull_${Date.now()}`,
      type: 'risk',
      severity: 'critical',
      title: 'EMERGENCY: Overseer Hard Pull Executed',
      message: `All trading halted. Reason: ${reason}`,
      acknowledged: false,
      createdAt: new Date()
    }]);

    // Notify analyst to inform user
    eventBus.emit('analyst.emergency_notification', {
      type: 'hard_pull',
      reason,
      timestamp: new Date()
    });
  }

  // Public methods
  setActive(active: boolean): void {
    this.isActive = active;
    if (active) {
      this.startMonitoring();
    } else if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    logService.log('info', `Overseer ${active ? 'activated' : 'deactivated'}`);
    eventBus.emit('overseer.status_changed', { active });
  }

  clearEmergencyMode(): void {
    this.emergencyMode = false;
    logService.log('info', 'Emergency mode cleared by user');
    eventBus.emit('overseer.emergency_mode_cleared', {});
  }

  isOverseerActive(): boolean {
    return this.isActive;
  }

  isInEmergencyMode(): boolean {
    return this.emergencyMode;
  }
}

// Export instances
export const monarch = new Monarch();
export const overseer = new Overseer();