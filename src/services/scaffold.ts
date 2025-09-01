// Core Scaffold Implementation - System orchestration and state management

import { 
  SystemState, 
  LogicLayerState, 
  EventTopic, 
  BotToggleState, 
  RiskKillState,
  AlertSeverity,
  FreshnessLevel
} from '@/types/core';
import { 
  SYSTEM_VERSION, 
  EVENT_TOPICS, 
  FEATURE_FLAGS, 
  RISK_THRESHOLDS,
  SYSTEM_LIMITS 
} from '@/utils/constants';
import { generateULID, getULIDAge } from '@/utils/ulid';
import { 
  calculateRelevance, 
  calculateRiskState, 
  calculateConfidence,
  getFreshnessLevel 
} from '@/utils/formulas';
import { eventBus } from './eventBus';
import { logService } from './logging';

class CoreScaffold {
  private systemState: SystemState;
  private logicLayerState: LogicLayerState;
  private startTime: Date;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.startTime = new Date();
    this.systemState = this.initializeSystemState();
    this.logicLayerState = this.initializeLogicLayerState();
    
    this.initializeEventListeners();
    this.startHealthChecks();
    
    logService.log('info', 'Core Scaffold initialized', { 
      version: SYSTEM_VERSION,
      startTime: this.startTime
    });
  }

  private initializeSystemState(): SystemState {
    return {
      version: SYSTEM_VERSION,
      uptime_seconds: 0,
      market_state: this.determineMarketState(),
      risk_state: 0,
      feature_flags: { ...FEATURE_FLAGS },
      last_refresh: new Date()
    };
  }

  private initializeLogicLayerState(): LogicLayerState {
    return {
      repository: {
        last_clean: new Date(),
        processed_feeds: 0,
        rejected_stale: 0,
        dedupe_count: 0
      },
      oracle: {
        active_signals: 0,
        last_signal_generated: new Date(),
        signal_types: []
      },
      bid: {
        last_snapshot: new Date(),
        portfolio_value: 0,
        risk_state: 0,
        exposure_count: 0
      },
      monarch: {
        active: true,
        last_decision: new Date(),
        soft_pulls_today: 0,
        hard_pulls_today: 0
      },
      overseer: {
        active: true,
        positions_monitored: 0,
        alerts_active: 0
      }
    };
  }

  private initializeEventListeners() {
    // Repository events
    eventBus.on('repository.feed_processed', (data) => {
      this.logicLayerState.repository.processed_feeds++;
      this.logicLayerState.repository.last_clean = new Date();
    });

    eventBus.on('repository.stale_rejected', (data) => {
      this.logicLayerState.repository.rejected_stale++;
    });

    // Oracle events
    eventBus.on(EVENT_TOPICS.ORACLE_SIGNAL_CREATED, (data) => {
      this.logicLayerState.oracle.active_signals++;
      this.logicLayerState.oracle.last_signal_generated = new Date();
      if (!this.logicLayerState.oracle.signal_types.includes(data.type)) {
        this.logicLayerState.oracle.signal_types.push(data.type);
      }
    });

    // BID events
    eventBus.on(EVENT_TOPICS.PORTFOLIO_UPDATED, (data) => {
      this.logicLayerState.bid.last_snapshot = new Date();
      this.logicLayerState.bid.portfolio_value = data.totalValue || 0;
    });

    // Risk Governor events
    eventBus.on(EVENT_TOPICS.RISK_SOFT_PULL, (data) => {
      this.logicLayerState.monarch.soft_pulls_today++;
      this.logicLayerState.monarch.last_decision = new Date();
    });

    eventBus.on(EVENT_TOPICS.RISK_HARD_PULL, (data) => {
      this.logicLayerState.monarch.hard_pulls_today++;
      this.logicLayerState.monarch.last_decision = new Date();
    });

    // Trade events
    eventBus.on(EVENT_TOPICS.TRADE_INTENT, (data) => {
      this.recordTradeIntent(data);
    });

    eventBus.on(EVENT_TOPICS.TRADE_EXECUTED, (data) => {
      this.recordTradeExecution(data);
    });
  }

  private startHealthChecks() {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private performHealthCheck() {
    const now = new Date();
    this.systemState.uptime_seconds = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    this.systemState.last_refresh = now;
    this.systemState.market_state = this.determineMarketState();
    
    // Update risk state based on current conditions
    this.updateSystemRiskState();
    
    // Reset daily counters if needed
    this.resetDailyCountersIfNeeded();
    
    // Emit health check event
    eventBus.emit('scaffold.health_check', {
      systemState: this.systemState,
      logicLayerState: this.logicLayerState
    });
  }

  private determineMarketState(): SystemState['market_state'] {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    if (!isWeekday) return 'closed';
    
    if (hour >= 4 && hour < 9.5) return 'pre_market';
    if (hour >= 9.5 && hour < 16) return 'open';
    if (hour >= 16 && hour < 20) return 'after_hours';
    return 'closed';
  }

  private updateSystemRiskState() {
    // Calculate system-wide risk state
    const riskComponents = {
      drawdown_norm: this.calculateSystemDrawdown(),
      exposure_norm: this.calculateSystemExposure(),
      vol_spike_norm: this.calculateVolatilitySpike(),
      liquidity_norm: this.calculateLiquidityRisk(),
      concentration_norm: this.calculateConcentrationRisk()
    };
    
    this.systemState.risk_state = calculateRiskState(riskComponents);
    this.logicLayerState.bid.risk_state = this.systemState.risk_state;
  }

  private calculateSystemDrawdown(): number {
    // Mock calculation - would use real portfolio data
    return Math.random() * 0.3; // 0-30% drawdown
  }

  private calculateSystemExposure(): number {
    // Mock calculation - would use real exposure data
    return Math.random() * 0.8; // 0-80% exposure
  }

  private calculateVolatilitySpike(): number {
    // Mock calculation - would use real volatility data
    return Math.random() * 0.5; // 0-50% vol spike
  }

  private calculateLiquidityRisk(): number {
    // Mock calculation - would use real liquidity data
    return Math.random() * 0.2; // 0-20% liquidity risk
  }

  private calculateConcentrationRisk(): number {
    // Mock calculation - would use real concentration data
    return Math.random() * 0.4; // 0-40% concentration risk
  }

  private resetDailyCountersIfNeeded() {
    const now = new Date();
    const lastReset = new Date(this.logicLayerState.monarch.last_decision);
    
    // Reset at midnight
    if (now.getDate() !== lastReset.getDate()) {
      this.logicLayerState.monarch.soft_pulls_today = 0;
      this.logicLayerState.monarch.hard_pulls_today = 0;
      
      logService.log('info', 'Daily counters reset', {
        date: now.toDateString()
      });
    }
  }

  private recordTradeIntent(data: any) {
    const intentId = generateULID('bot_');
    
    logService.log('info', 'Trade intent recorded', {
      intentId,
      symbol: data.symbol,
      side: data.side,
      confidence: data.confidence
    });
  }

  private recordTradeExecution(data: any) {
    logService.log('info', 'Trade execution recorded', {
      orderId: data.orderId,
      status: data.status,
      fillPrice: data.fillPrice
    });
  }

  // Public API Methods

  public getSystemState(): SystemState {
    return { ...this.systemState };
  }

  public getLogicLayerState(): LogicLayerState {
    return JSON.parse(JSON.stringify(this.logicLayerState));
  }

  public updateFeatureFlag(flag: string, value: boolean): void {
    this.systemState.feature_flags[flag] = value;
    
    eventBus.emit('scaffold.feature_flag_updated', {
      flag,
      value,
      timestamp: new Date()
    });
    
    logService.log('info', 'Feature flag updated', { flag, value });
  }

  public isFeatureEnabled(flag: string): boolean {
    return this.systemState.feature_flags[flag] || false;
  }

  public getSystemMetrics() {
    return {
      version: this.systemState.version,
      uptime_seconds: this.systemState.uptime_seconds,
      market_state: this.systemState.market_state,
      risk_state: this.systemState.risk_state,
      active_signals: this.logicLayerState.oracle.active_signals,
      portfolio_value: this.logicLayerState.bid.portfolio_value,
      daily_trades: this.logicLayerState.monarch.soft_pulls_today + this.logicLayerState.monarch.hard_pulls_today,
      last_refresh: this.systemState.last_refresh
    };
  }

  public evaluateDataFreshness(timestamp: Date): FreshnessLevel {
    const ageSeconds = (Date.now() - timestamp.getTime()) / 1000;
    return getFreshnessLevel(ageSeconds);
  }

  public generateEntityId(prefix?: string): string {
    return generateULID(prefix as any);
  }

  public validateRiskThresholds(riskState: number): RiskKillState {
    if (riskState >= RISK_THRESHOLDS.HARD_PULL_THRESHOLD) {
      return RiskKillState.HARD_PULL;
    } else if (riskState >= RISK_THRESHOLDS.SOFT_PULL_THRESHOLD) {
      return RiskKillState.SOFT_PULL;
    }
    return RiskKillState.NORMAL;
  }

  public createAlert(severity: AlertSeverity, title: string, message: string, data?: any) {
    const alertId = this.generateEntityId('alrt_');
    
    const alert = {
      id: alertId,
      severity,
      title,
      message,
      data: data || {},
      created_at: new Date(),
      acknowledged: false
    };
    
    eventBus.emit(EVENT_TOPICS.ALERT_CREATED, alert);
    
    logService.log('warn', `Alert created: ${title}`, alert);
    
    return alert;
  }

  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    logService.log('info', 'Core Scaffold shutting down', {
      uptime_seconds: this.systemState.uptime_seconds
    });
  }
}

// Export singleton instance
export const coreScaffold = new CoreScaffold();