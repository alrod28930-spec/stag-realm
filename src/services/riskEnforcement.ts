// Risk Enforcement Service - Enforces risk controls across the trading platform

import { toggleService } from './toggleService';
import { eventBus } from './eventBus';
import { createLogger } from './logging';

const logger = createLogger('RiskEnforcement');

export interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop';
  source: string; // 'manual' | 'bot' | 'api'
}

export interface RiskCheckResult {
  allowed: boolean;
  action: 'block' | 'modify' | 'allow';
  modifications?: Partial<TradeRequest>;
  warnings: string[];
  violations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PortfolioRiskParams {
  totalValue: number;
  availableCash: number;
  positions: Array<{
    symbol: string;
    value: number;
    sector?: string;
  }>;
}

class RiskEnforcementService {
  private blacklistedSymbols: Set<string> = new Set(['MEME', 'PUMP']);
  private dailyLossThreshold = 0.05; // 5% of portfolio
  private maxPositionSize = 0.10; // 10% of portfolio
  private minTradePrice = 1.00;
  private minTradeSize = 100;

  constructor() {
    // Listen for risk toggle changes
    toggleService.subscribe((state) => {
      logger.info('Risk controls updated', { 
        riskGovernorsEnabled: state.riskGovernorsEnabled,
        hardPull: state.hardPullEnabled,
        softPull: state.softPullEnabled 
      });
    });
  }

  /**
   * Main risk check function - validates a trade request against all enabled controls
   */
  public async checkTradeRisk(
    request: TradeRequest, 
    portfolio?: PortfolioRiskParams
  ): Promise<RiskCheckResult> {
    const toggles = toggleService.getToggleState();
    
    // If risk governors are disabled, allow with warning
    if (!toggles.riskGovernorsEnabled) {
      return {
        allowed: true,
        action: 'allow',
        warnings: ['Risk governors are disabled - trading without safety controls'],
        violations: [],
        riskLevel: 'critical'
      };
    }

    const warnings: string[] = [];
    const violations: string[] = [];
    let modifications: Partial<TradeRequest> = {};
    let highestRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 1. Blacklist enforcement
    if (toggles.blacklistEnforced && this.blacklistedSymbols.has(request.symbol)) {
      violations.push(`Symbol ${request.symbol} is blacklisted`);
      highestRiskLevel = 'critical';
    }

    // 2. Minimum trade thresholds
    if (toggles.minimumTradeThresholds) {
      if (request.price && request.price < this.minTradePrice) {
        violations.push(`Price $${request.price} below minimum $${this.minTradePrice}`);
        highestRiskLevel = this.getHigherRiskLevel(highestRiskLevel, 'medium');
      }
      
      if (request.quantity < this.minTradeSize) {
        violations.push(`Quantity ${request.quantity} below minimum ${this.minTradeSize}`);
        highestRiskLevel = this.getHigherRiskLevel(highestRiskLevel, 'medium');
      }
    }

    // 3. Portfolio-level risk checks (if portfolio data available)
    if (portfolio && toggles.exposureLimitsEnabled) {
      const tradeValue = (request.price || 0) * request.quantity;
      const positionPercent = tradeValue / portfolio.totalValue;
      
      if (positionPercent > this.maxPositionSize) {
        const maxQuantity = Math.floor((portfolio.totalValue * this.maxPositionSize) / (request.price || 1));
        
        if (toggles.softPullEnabled) {
          modifications.quantity = maxQuantity;
          warnings.push(`Position size reduced from ${request.quantity} to ${maxQuantity} shares`);
          highestRiskLevel = this.getHigherRiskLevel(highestRiskLevel, 'medium');
        } else {
          violations.push(`Position size ${positionPercent.toFixed(1)}% exceeds limit ${(this.maxPositionSize * 100).toFixed(1)}%`);
          highestRiskLevel = 'high';
        }
      }
    }

    // 4. Daily drawdown protection
    if (toggles.dailyDrawdownGuard) {
      // This would integrate with real P&L tracking
      // For now, we'll simulate a check
      const dailyLoss = this.getDailyLoss(); // Mock function
      if (dailyLoss > this.dailyLossThreshold) {
        violations.push(`Daily loss limit exceeded: ${(dailyLoss * 100).toFixed(1)}%`);
        highestRiskLevel = 'critical';
      }
    }

    // Determine final action based on toggles and violations
    let action: 'block' | 'modify' | 'allow' = 'allow';
    let allowed = true;

    if (violations.length > 0) {
      if (toggles.hardPullEnabled) {
        action = 'block';
        allowed = false;
      } else if (toggles.softPullEnabled && Object.keys(modifications).length > 0) {
        action = 'modify';
        allowed = true;
      } else {
        action = 'allow';
        allowed = true;
        warnings.push('Risk violations detected but enforcement is disabled');
      }
    } else if (Object.keys(modifications).length > 0) {
      action = 'modify';
    }

    // Log the risk check
    logger.info('Trade risk check completed', {
      symbol: request.symbol,
      action,
      allowed,
      riskLevel: highestRiskLevel,
      violationsCount: violations.length,
      warningsCount: warnings.length
    });

    return {
      allowed,
      action,
      modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
      warnings,
      violations,
      riskLevel: highestRiskLevel
    };
  }

  /**
   * Check if trading is allowed in current risk state
   */
  public isTradingAllowed(): boolean {
    const toggles = toggleService.getToggleState();
    const riskStatus = toggleService.getRiskStatus();
    
    // If no risk controls are enabled, still allow but with warnings
    if (!toggles.riskGovernorsEnabled) {
      return true;
    }

    // Check for critical risk states that would halt trading
    const dailyLoss = this.getDailyLoss();
    if (toggles.dailyDrawdownGuard && dailyLoss > this.dailyLossThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Get current risk enforcement status
   */
  public getRiskEnforcementStatus() {
    const toggles = toggleService.getToggleState();
    const riskStatus = toggleService.getRiskStatus();
    
    return {
      tradingAllowed: this.isTradingAllowed(),
      enforcementLevel: toggles.riskGovernorsEnabled 
        ? (toggles.hardPullEnabled ? 'strict' : 'moderate') 
        : 'disabled',
      activeControls: [
        toggles.blacklistEnforced && 'Blacklist',
        toggles.exposureLimitsEnabled && 'Position Limits', 
        toggles.dailyDrawdownGuard && 'Drawdown Protection',
        toggles.minimumTradeThresholds && 'Minimum Thresholds'
      ].filter(Boolean),
      riskStatus,
      dailyLossPercent: this.getDailyLoss() * 100
    };
  }

  /**
   * Force reset all risk controls to safe state
   */
  public emergencyReset(reason: string = 'Emergency reset triggered') {
    logger.warn('Emergency risk reset initiated', { reason });
    toggleService.resetToSafeDefaults(reason);
    eventBus.emit('risk.emergency_reset', { reason, timestamp: new Date() });
  }

  // Mock functions - would integrate with real data in production
  private getDailyLoss(): number {
    // Mock daily loss calculation - would use real P&L data
    return Math.random() * 0.03; // 0-3% simulated daily loss
  }

  private getHigherRiskLevel(current: 'low' | 'medium' | 'high' | 'critical', newLevel: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[newLevel] > levels[current] ? newLevel : current;
  }

  /**
   * Add symbol to blacklist
   */
  public addToBlacklist(symbol: string, reason?: string) {
    this.blacklistedSymbols.add(symbol.toUpperCase());
    logger.info('Symbol added to blacklist', { symbol, reason });
    eventBus.emit('risk.symbol_blacklisted', { symbol, reason });
  }

  /**
   * Remove symbol from blacklist
   */
  public removeFromBlacklist(symbol: string, reason?: string) {
    this.blacklistedSymbols.delete(symbol.toUpperCase());
    logger.info('Symbol removed from blacklist', { symbol, reason });
    eventBus.emit('risk.symbol_unblacklisted', { symbol, reason });
  }

  /**
   * Get blacklisted symbols
   */
  public getBlacklistedSymbols(): string[] {
    return Array.from(this.blacklistedSymbols);
  }
}

export const riskEnforcement = new RiskEnforcementService();