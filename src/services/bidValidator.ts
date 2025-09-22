// BID Validator - Risk enforcement with learning capabilities

import { logService } from './logging';
import { eventBus } from './eventBus';
import { generateULID } from '@/utils/ulid';
import { userProgression } from './userProgression';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'risk' | 'compliance' | 'behavioral' | 'market';
  severity: 'warning' | 'error' | 'critical';
  isActive: boolean;
  parameters: Record<string, any>;
  violationCount: number;
  effectiveness: number; // 0-1, how well this rule prevents losses
  lastViolation: Date | null;
  adaptiveThreshold: number; // Learned threshold
  userSpecific: Map<string, any>; // User-specific learned parameters
}

export interface ValidationResult {
  passed: boolean;
  violations: {
    ruleId: string;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    suggestedAction: string;
    blockTrade: boolean;
  }[];
  warnings: string[];
  adaptedRules: string[]; // Rules that were adapted based on user learning
}

export interface ValidationContext {
  userId: string;
  workspaceId: string;
  tradeType: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  currentPortfolio: any;
  marketConditions: any;
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  riskProfile: any;
}

export class BIDValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private validationHistory: Map<string, any[]> = new Map(); // userId -> history
  private ruleEffectiveness: Map<string, number> = new Map(); // Track how well rules work
  
  constructor() {
    this.initializeDefaultRules();
    this.initializeEventListeners();
  }
  
  private initializeDefaultRules(): void {
    const defaultRules: Omit<ValidationRule, 'violationCount' | 'lastViolation' | 'userSpecific'>[] = [
      {
        id: 'position_size_limit',
        name: 'Position Size Limit',
        type: 'risk',
        severity: 'error',
        isActive: true,
        parameters: {
          maxPositionPercent: 0.10, // 10% of portfolio max
          absoluteMaxDollars: 50000
        },
        effectiveness: 0.8,
        adaptiveThreshold: 0.10
      },
      {
        id: 'daily_loss_limit',
        name: 'Daily Loss Limit',
        type: 'risk',
        severity: 'critical',
        isActive: true,
        parameters: {
          maxDailyLossPercent: 0.05, // 5% daily loss max
          absoluteMaxDollars: 10000
        },
        effectiveness: 0.9,
        adaptiveThreshold: 0.05
      },
      {
        id: 'penny_stock_filter',
        name: 'Penny Stock Filter',
        type: 'risk',
        severity: 'warning',
        isActive: true,
        parameters: {
          minPrice: 5.00,
          minMarketCap: 100000000 // $100M
        },
        effectiveness: 0.7,
        adaptiveThreshold: 5.00
      },
      {
        id: 'sector_concentration',
        name: 'Sector Concentration Limit',
        type: 'risk',
        severity: 'warning',
        isActive: true,
        parameters: {
          maxSectorPercent: 0.30 // 30% in any sector
        },
        effectiveness: 0.6,
        adaptiveThreshold: 0.30
      },
      {
        id: 'volatility_filter',
        name: 'High Volatility Filter',
        type: 'market',
        severity: 'warning',
        isActive: true,
        parameters: {
          maxBeta: 2.0,
          maxHistoricalVolatility: 0.60 // 60% annualized
        },
        effectiveness: 0.5,
        adaptiveThreshold: 2.0
      },
      {
        id: 'overtrading_prevention',
        name: 'Overtrading Prevention',
        type: 'behavioral',
        severity: 'warning',
        isActive: true,
        parameters: {
          maxTradesPerDay: 10,
          maxTradesPerHour: 3
        },
        effectiveness: 0.7,
        adaptiveThreshold: 10
      },
      {
        id: 'insufficient_research',
        name: 'Research Requirement',
        type: 'behavioral',
        severity: 'warning',
        isActive: true,
        parameters: {
          minResearchTimeMinutes: 5,
          requireAnalystView: false
        },
        effectiveness: 0.4,
        adaptiveThreshold: 5
      },
      {
        id: 'emotional_trading_filter',
        name: 'Emotional Trading Filter',
        type: 'behavioral',
        severity: 'warning',
        isActive: true,
        parameters: {
          cooldownAfterLossMinutes: 30,
          maxConsecutiveTrades: 5
        },
        effectiveness: 0.6,
        adaptiveThreshold: 30
      }
    ];
    
    defaultRules.forEach(rule => {
      const fullRule: ValidationRule = {
        ...rule,
        violationCount: 0,
        lastViolation: null,
        userSpecific: new Map()
      };
      this.rules.set(rule.id, fullRule);
    });
  }
  
  private initializeEventListeners(): void {
    // Learn from trade outcomes
    eventBus.on('trade.closed', (outcome) => {
      this.learnFromTradeOutcome(outcome);
    });
    
    // Track rule violations
    eventBus.on('validation.violation', (violation) => {
      this.recordViolation(violation);
    });
    
    // Adapt rules based on user progression
    eventBus.on('user.level_progression', (progression) => {
      this.adaptRulesForUserLevel(progression.userId, progression.newLevel);
    });
  }
  
  public async validateTrade(context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      violations: [],
      warnings: [],
      adaptedRules: []
    };
    
    // Get user-specific adaptations
    await this.adaptRulesForUser(context);
    
    // Apply each active rule
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;
      
      const violation = await this.applyRule(rule, context);
      if (violation) {
        result.violations.push(violation);
        
        if (violation.severity === 'critical' || violation.severity === 'error') {
          result.passed = false;
        }
        
        if (violation.severity === 'warning') {
          result.warnings.push(violation.message);
        }
        
        // Track violation
        this.trackRuleViolation(rule.id, context);
      }
    }
    
    // Log validation result
    this.logValidationResult(context, result);
    
    return result;
  }
  
  private async adaptRulesForUser(context: ValidationContext): Promise<void> {
    const userProfile = userProgression.getUserProfile(context.userId);
    if (!userProfile) return;
    
    // Adapt rules based on user's experience and behavior
    this.rules.forEach(rule => {
      const userAdaptation = this.calculateUserAdaptation(rule, userProfile, context);
      if (userAdaptation) {
        rule.userSpecific.set(context.userId, userAdaptation);
      }
    });
  }
  
  private calculateUserAdaptation(rule: ValidationRule, userProfile: any, context: ValidationContext): any | null {
    const adaptations: any = {};
    let hasAdaptations = false;
    
    switch (rule.id) {
      case 'position_size_limit':
        // More experienced users can handle larger positions
        if (context.userLevel === 'advanced' || context.userLevel === 'expert') {
          const multiplier = context.userLevel === 'expert' ? 1.5 : 1.2;
          adaptations.maxPositionPercent = rule.parameters.maxPositionPercent * multiplier;
          hasAdaptations = true;
        }
        
        // Conservative users get tighter limits
        if (userProfile.personalityType === 'conservative') {
          adaptations.maxPositionPercent = rule.parameters.maxPositionPercent * 0.7;
          hasAdaptations = true;
        }
        break;
        
      case 'volatility_filter':
        // Adapt based on user's risk tolerance
        const riskTolerance = userProfile.riskTolerance || 0.5;
        adaptations.maxBeta = rule.parameters.maxBeta * (0.5 + riskTolerance);
        hasAdaptations = true;
        break;
        
      case 'overtrading_prevention':
        // Adapt based on user's trading frequency and success
        const avgPerformance = userProfile.decisionPatterns?.avgPerformance || 0.5;
        if (avgPerformance > 0.7) {
          // Successful trader can trade more
          adaptations.maxTradesPerDay = Math.floor(rule.parameters.maxTradesPerDay * 1.3);
          hasAdaptations = true;
        } else if (avgPerformance < 0.4) {
          // Struggling trader gets more restrictions
          adaptations.maxTradesPerDay = Math.floor(rule.parameters.maxTradesPerDay * 0.7);
          hasAdaptations = true;
        }
        break;
        
      case 'emotional_trading_filter':
        // Adapt based on user's behavioral patterns
        if (userProfile.personalityType === 'aggressive') {
          adaptations.cooldownAfterLossMinutes = rule.parameters.cooldownAfterLossMinutes * 1.5;
          hasAdaptations = true;
        }
        break;
    }
    
    return hasAdaptations ? adaptations : null;
  }
  
  private async applyRule(rule: ValidationRule, context: ValidationContext): Promise<ValidationResult['violations'][0] | null> {
    const userAdaptation = rule.userSpecific.get(context.userId) || {};
    const effectiveParams = { ...rule.parameters, ...userAdaptation };
    
    switch (rule.id) {
      case 'position_size_limit':
        return this.checkPositionSizeLimit(rule, effectiveParams, context);
        
      case 'daily_loss_limit':
        return this.checkDailyLossLimit(rule, effectiveParams, context);
        
      case 'penny_stock_filter':
        return this.checkPennyStockFilter(rule, effectiveParams, context);
        
      case 'sector_concentration':
        return this.checkSectorConcentration(rule, effectiveParams, context);
        
      case 'volatility_filter':
        return this.checkVolatilityFilter(rule, effectiveParams, context);
        
      case 'overtrading_prevention':
        return this.checkOvertradingPrevention(rule, effectiveParams, context);
        
      case 'insufficient_research':
        return this.checkResearchRequirement(rule, effectiveParams, context);
        
      case 'emotional_trading_filter':
        return this.checkEmotionalTradingFilter(rule, effectiveParams, context);
        
      default:
        return null;
    }
  }
  
  // Rule implementations
  private checkPositionSizeLimit(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const positionValue = context.quantity * context.price;
    const portfolioValue = context.currentPortfolio?.totalEquity || 100000;
    const positionPercent = positionValue / portfolioValue;
    
    if (positionPercent > params.maxPositionPercent || positionValue > params.absoluteMaxDollars) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Position size (${(positionPercent * 100).toFixed(1)}% of portfolio) exceeds limit (${(params.maxPositionPercent * 100).toFixed(1)}%)`,
        suggestedAction: `Reduce position size to ${Math.floor(portfolioValue * params.maxPositionPercent / context.price)} shares`,
        blockTrade: rule.severity === 'error' || rule.severity === 'critical'
      };
    }
    
    return null;
  }
  
  private checkDailyLossLimit(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const todayLoss = this.getTodayLoss(context.userId);
    const portfolioValue = context.currentPortfolio?.totalEquity || 100000;
    const lossPercent = Math.abs(todayLoss) / portfolioValue;
    
    if (lossPercent >= params.maxDailyLossPercent || Math.abs(todayLoss) >= params.absoluteMaxDollars) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Daily loss limit reached: ${(lossPercent * 100).toFixed(1)}% (${todayLoss.toFixed(2)})`,
        suggestedAction: 'Stop trading for today and review strategy',
        blockTrade: true
      };
    }
    
    return null;
  }
  
  private checkPennyStockFilter(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    if (context.price < params.minPrice) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Stock price $${context.price} is below minimum $${params.minPrice}`,
        suggestedAction: 'Consider higher-priced, more liquid stocks',
        blockTrade: false
      };
    }
    
    return null;
  }
  
  private checkSectorConcentration(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const sectorExposure = this.calculateSectorExposure(context);
    const symbolSector = this.getSymbolSector(context.symbol);
    
    if (symbolSector && sectorExposure[symbolSector] > params.maxSectorPercent) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `${symbolSector} sector exposure (${(sectorExposure[symbolSector] * 100).toFixed(1)}%) exceeds limit (${(params.maxSectorPercent * 100).toFixed(1)}%)`,
        suggestedAction: 'Consider diversifying into other sectors',
        blockTrade: false
      };
    }
    
    return null;
  }
  
  private checkVolatilityFilter(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const symbolBeta = this.getSymbolBeta(context.symbol);
    
    if (symbolBeta > params.maxBeta) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Stock beta (${symbolBeta.toFixed(2)}) exceeds maximum (${params.maxBeta})`,
        suggestedAction: 'Consider lower-volatility alternatives',
        blockTrade: false
      };
    }
    
    return null;
  }
  
  private checkOvertradingPrevention(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const todayTrades = this.getTodayTradeCount(context.userId);
    const hourlyTrades = this.getHourlyTradeCount(context.userId);
    
    if (todayTrades >= params.maxTradesPerDay) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Daily trade limit reached (${todayTrades}/${params.maxTradesPerDay})`,
        suggestedAction: 'Wait until tomorrow or review trading frequency',
        blockTrade: rule.severity === 'error'
      };
    }
    
    if (hourlyTrades >= params.maxTradesPerHour) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Hourly trade limit reached (${hourlyTrades}/${params.maxTradesPerHour})`,
        suggestedAction: 'Wait before placing another trade',
        blockTrade: false
      };
    }
    
    return null;
  }
  
  private checkResearchRequirement(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    // This would check if user has spent enough time researching the symbol
    // For now, simplified implementation
    return null;
  }
  
  private checkEmotionalTradingFilter(rule: ValidationRule, params: any, context: ValidationContext): ValidationResult['violations'][0] | null {
    const lastLoss = this.getLastLossTime(context.userId);
    const consecutiveTrades = this.getConsecutiveTradeCount(context.userId);
    
    if (lastLoss && (Date.now() - lastLoss.getTime()) < params.cooldownAfterLossMinutes * 60 * 1000) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: 'Cooling-off period active after recent loss',
        suggestedAction: `Wait ${params.cooldownAfterLossMinutes} minutes after losses before trading`,
        blockTrade: false
      };
    }
    
    if (consecutiveTrades >= params.maxConsecutiveTrades) {
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: `Too many consecutive trades (${consecutiveTrades})`,
        suggestedAction: 'Take a break to avoid emotional trading',
        blockTrade: false
      };
    }
    
    return null;
  }
  
  // Learning methods
  private learnFromTradeOutcome(outcome: any): void {
    const userId = outcome.userId;
    const violatedRules = this.getViolatedRulesForTrade(outcome.tradeId);
    
    violatedRules.forEach(ruleId => {
      const rule = this.rules.get(ruleId);
      if (!rule) return;
      
      // If trade was profitable despite violation, reduce rule effectiveness
      // If trade was loss and rule was violated, increase effectiveness
      if (outcome.realized_pnl > 0) {
        rule.effectiveness = Math.max(0.1, rule.effectiveness - 0.05);
      } else {
        rule.effectiveness = Math.min(1.0, rule.effectiveness + 0.1);
      }
      
      this.ruleEffectiveness.set(ruleId, rule.effectiveness);
    });
    
    // Learn from successful trades that didn't violate rules
    if (outcome.realized_pnl > 0) {
      this.reinforceSuccessfulPatterns(userId, outcome);
    }
  }
  
  private reinforceSuccessfulPatterns(userId: string, outcome: any): void {
    // This would analyze what made the trade successful and adjust rules accordingly
    // For example, if user consistently profits from slightly larger position sizes,
    // we might gradually relax position size limits for that user
  }
  
  private recordViolation(violation: any): void {
    const rule = this.rules.get(violation.ruleId);
    if (rule) {
      rule.violationCount++;
      rule.lastViolation = new Date();
    }
  }
  
  private trackRuleViolation(ruleId: string, context: ValidationContext): void {
    const history = this.validationHistory.get(context.userId) || [];
    history.push({
      timestamp: new Date(),
      ruleId,
      context: {
        symbol: context.symbol,
        quantity: context.quantity,
        price: context.price
      }
    });
    
    // Keep recent history
    if (history.length > 100) {
      history.shift();
    }
    
    this.validationHistory.set(context.userId, history);
  }
  
  private adaptRulesForUserLevel(userId: string, level: string): void {
    // Adjust rules based on user's progression
    if (level === 'advanced' || level === 'expert') {
      // Relax some restrictions for experienced users
      const positionRule = this.rules.get('position_size_limit');
      if (positionRule) {
        const currentAdaptation = positionRule.userSpecific.get(userId) || {};
        currentAdaptation.maxPositionPercent = positionRule.parameters.maxPositionPercent * 1.3;
        positionRule.userSpecific.set(userId, currentAdaptation);
      }
    }
  }
  
  // Helper methods (simplified implementations)
  private getTodayLoss(userId: string): number {
    // Would calculate actual P&L for today
    return -500; // Mock
  }
  
  private getTodayTradeCount(userId: string): number {
    const history = this.validationHistory.get(userId) || [];
    const today = new Date().toDateString();
    return history.filter(h => h.timestamp.toDateString() === today).length;
  }
  
  private getHourlyTradeCount(userId: string): number {
    const history = this.validationHistory.get(userId) || [];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return history.filter(h => h.timestamp > hourAgo).length;
  }
  
  private calculateSectorExposure(context: ValidationContext): Record<string, number> {
    // Would calculate actual sector exposure from portfolio
    return { Technology: 0.25, Healthcare: 0.15 }; // Mock
  }
  
  private getSymbolSector(symbol: string): string | null {
    // Would lookup actual sector
    return 'Technology'; // Mock
  }
  
  private getSymbolBeta(symbol: string): number {
    // Would lookup actual beta
    return 1.2; // Mock
  }
  
  private getLastLossTime(userId: string): Date | null {
    // Would find last losing trade timestamp
    return null; // Mock
  }
  
  private getConsecutiveTradeCount(userId: string): number {
    // Would count consecutive trades without breaks
    return 2; // Mock
  }
  
  private getViolatedRulesForTrade(tradeId: string): string[] {
    // Would lookup rules violated for specific trade
    return []; // Mock
  }
  
  private logValidationResult(context: ValidationContext, result: ValidationResult): void {
    logService.log('debug', 'Trade validation completed', {
      userId: context.userId,
      symbol: context.symbol,
      passed: result.passed,
      violationCount: result.violations.length,
      warningCount: result.warnings.length
    });
  }
  
  // Public API
  public getRule(ruleId: string): ValidationRule | null {
    return this.rules.get(ruleId) || null;
  }
  
  public getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }
  
  public updateRule(ruleId: string, updates: Partial<ValidationRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      eventBus.emit('validation.rule_updated', { ruleId, rule });
    }
  }
  
  public createCustomRule(config: Omit<ValidationRule, 'violationCount' | 'lastViolation' | 'userSpecific'>): void {
    const rule: ValidationRule = {
      ...config,
      violationCount: 0,
      lastViolation: null,
      userSpecific: new Map()
    };
    
    this.rules.set(config.id, rule);
    eventBus.emit('validation.rule_created', rule);
  }
  
  public getUserValidationHistory(userId: string): any[] {
    return this.validationHistory.get(userId) || [];
  }
  
  public getRuleEffectiveness(): Map<string, number> {
    return new Map(this.ruleEffectiveness);
  }
}

export const bidValidator = new BIDValidator();
