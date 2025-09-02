import { logService } from './logging';
import { eventBus } from './eventBus';
import { recorder } from './recorder';
import {
  DisclaimerType,
  DisclaimerAcknowledgment,
  ComplianceSettings,
  ComplianceEvent,
  RiskAcknowledgment,
  LegalFooter,
  SubscriptionTier
} from '../types/compliance';

// Compliance Service - Manages disclaimers, risk acknowledgments, and legal compliance
export class ComplianceService {
  private disclaimers: DisclaimerType[] = [];
  private acknowledgments: DisclaimerAcknowledgment[] = [];
  private complianceEvents: ComplianceEvent[] = [];
  private settings: ComplianceSettings;
  private currentSessionId: string;
  private dailyDisclaimerShown = false;

  constructor() {
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize default compliance settings
    this.settings = {
      disclaimersEnabled: true,
      requireAcknowledgments: true,
      logAllInteractions: true,
      riskThresholds: {
        maxDailyLoss: 5.0, // 5%
        maxPositionSize: 15.0, // 15% of portfolio
        volatilityWarningLevel: 25.0, // VIX > 25
        concentrationWarningLevel: 0.4, // 40% concentration
        requireConfirmationAbove: 10000 // $10k trades
      },
      subscriptionTier: {
        level: 'standard',
        name: 'Standard',
        features: ['Basic Analytics', 'Standard Recommendations', 'Basic Export'],
        limits: {
          maxWatchlistItems: 50,
          maxSavedSearches: 10,
          maxDailyRecommendations: 20,
          maxAnalystQueries: 100,
          recordExportEnabled: true,
          advancedAnalyticsEnabled: false,
          customDisclaimersEnabled: false
        },
        complianceLevel: 'enhanced'
      },
      brokerComplianceMode: true
    };

    this.initializeDisclaimers();
    this.setupEventListeners();
    
    logService.log('info', 'Compliance Service initialized', {
      sessionId: this.currentSessionId,
      tier: this.settings.subscriptionTier.level
    });
  }

  private initializeDisclaimers(): void {
    this.disclaimers = [
      {
        id: 'session_start_analyst',
        type: 'session_start',
        title: 'Important Disclaimer',
        content: `StagAlgo is a software tool that provides market insights and analysis for educational purposes only. 

**NOT FINANCIAL ADVICE**: Nothing provided by StagAlgo constitutes financial, investment, trading, or other professional advice. All content is for informational purposes only.

**YOUR RESPONSIBILITY**: You are solely responsible for your trading and investment decisions. Always conduct your own research and consider consulting with qualified financial advisors.

**NO GUARANTEES**: Past performance does not guarantee future results. Trading involves substantial risk of loss.

**SOFTWARE TOOL**: StagAlgo is a portfolio mirror and analysis tool. We do not custody funds, execute trades directly, or act as a broker-dealer.`,
        severity: 'warning',
        requiresAcknowledgment: true,
        frequency: 'daily',
        contexts: [
          { component: 'analyst', priority: 1 }
        ]
      },
      {
        id: 'trade_intent_risk',
        type: 'trade_intent',
        title: 'Trade Intent Confirmation',
        content: `You are about to create a trade intent. Please confirm you understand:

• This is a draft trade idea, not an executed order
• You must review and approve any actual trades through your broker
• StagAlgo does not execute trades or custody funds
• All trading decisions and risks are your responsibility

Trading involves substantial risk and you can lose money.`,
        severity: 'warning',
        requiresAcknowledgment: true,
        frequency: 'always',
        contexts: [
          { component: 'trade_bots', action: 'execute', priority: 1 }
        ]
      },
      {
        id: 'recommendation_footer',
        type: 'recommendation',
        title: 'Investment Disclaimer',
        content: 'Informational insights only. Not financial advice. Conduct your own research.',
        severity: 'info',
        requiresAcknowledgment: false,
        frequency: 'always',
        contexts: [
          { component: 'recommendations', action: 'view', priority: 3 },
          { component: 'oracle', action: 'view', priority: 3 }
        ]
      },
      {
        id: 'high_risk_warning',
        type: 'risk_warning',
        title: 'High Risk Activity Detected',
        content: `WARNING: This action involves elevated risk factors:

• High volatility or leverage detected
• Position size exceeds recommended limits
• Market conditions show unusual activity

Please review your risk tolerance and position sizing carefully. Consider consulting with a financial advisor for significant positions.`,
        severity: 'critical',
        requiresAcknowledgment: true,
        frequency: 'always',
        contexts: [
          { component: 'trade_bots', action: 'execute', priority: 1 },
          { component: 'recommendations', action: 'interact', priority: 1 }
        ]
      },
      {
        id: 'market_search_general',
        type: 'general',
        title: 'Market Research Tool',
        content: 'This search tool provides market data for research purposes. Results are not investment recommendations.',
        severity: 'info',
        requiresAcknowledgment: false,
        frequency: 'once', // Changed from 'per_session' to 'once' so it only shows once ever
        contexts: [
          { component: 'market_search', action: 'view', priority: 2 }
        ]
      }
    ];
  }

  private setupEventListeners(): void {
    // Listen for component access events
    eventBus.on('component.accessed', (data: { component: string; action?: string; context?: any }) => {
      this.handleComponentAccess(data.component, data.action, data.context);
    });

    // Listen for trade intents
    eventBus.on('trade.intent.draft', (intent: any) => {
      this.handleTradeIntent(intent);
    });

    // Listen for risk events
    eventBus.on('risk.threshold_exceeded', (data: any) => {
      this.handleRiskThresholdExceeded(data);
    });

    // Reset daily disclaimer flag at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyDisclaimerShown = false;
      // Set up daily reset interval
      setInterval(() => {
        this.dailyDisclaimerShown = false;
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  // Handle component access and show relevant disclaimers
  private async handleComponentAccess(component: string, action?: string, context?: any): Promise<void> {
    if (!this.settings.disclaimersEnabled) return;

    // Find relevant disclaimers
    const relevantDisclaimers = this.disclaimers.filter(disclaimer =>
      disclaimer.contexts.some(ctx => 
        ctx.component === component && 
        (!action || !ctx.action || ctx.action === action)
      )
    );

    for (const disclaimer of relevantDisclaimers) {
      const shouldShow = this.shouldShowDisclaimer(disclaimer);
      
      if (shouldShow) {
        await this.showDisclaimer(disclaimer, { component, action, context });
      }
    }
  }

  // Determine if disclaimer should be shown based on frequency
  private shouldShowDisclaimer(disclaimer: DisclaimerType): boolean {
    const existingAck = this.acknowledgments.find(ack => 
      ack.disclaimerId === disclaimer.id && 
      ack.sessionId === this.currentSessionId
    );

    switch (disclaimer.frequency) {
      case 'once':
        return !this.acknowledgments.some(ack => ack.disclaimerId === disclaimer.id);
      
      case 'daily':
        if (disclaimer.id === 'session_start_analyst') {
          return !this.dailyDisclaimerShown;
        }
        const today = new Date().toDateString();
        return !this.acknowledgments.some(ack => 
          ack.disclaimerId === disclaimer.id && 
          ack.acknowledgedAt.toDateString() === today
        );
      
      case 'per_session':
        return !existingAck;
      
      case 'always':
        return true;
      
      default:
        return true;
    }
  }

  // Show disclaimer to user
  private async showDisclaimer(disclaimer: DisclaimerType, context: any): Promise<void> {
    // Log compliance event
    const event: ComplianceEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'disclaimer_shown',
      sessionId: this.currentSessionId,
      timestamp: new Date(),
      context: JSON.stringify(context),
      details: {
        disclaimerId: disclaimer.id,
        disclaimerType: disclaimer.type,
        requiresAck: disclaimer.requiresAcknowledgment
      }
    };

    this.complianceEvents.unshift(event);
    this.complianceEvents = this.complianceEvents.slice(0, 1000); // Keep last 1000 events

    // Record in Recorder
    recorder.recordOracleSignal({
      type: 'compliance_disclaimer_shown',
      signal: `Disclaimer shown: ${disclaimer.title}`,
      data: {
        disclaimerId: disclaimer.id,
        context: context,
        requiresAcknowledgment: disclaimer.requiresAcknowledgment
      }
    });

    // Emit event for UI to handle
    eventBus.emit('compliance.disclaimer_show', {
      disclaimer,
      context,
      eventId: event.id
    });

    logService.log('info', 'Disclaimer shown', {
      disclaimerId: disclaimer.id,
      type: disclaimer.type,
      context: context
    });

    // Mark daily disclaimer as shown if applicable
    if (disclaimer.id === 'session_start_analyst') {
      this.dailyDisclaimerShown = true;
    }
  }

  // Handle disclaimer acknowledgment (also handles non-acknowledgment disclaimer dismissals)
  async acknowledgeDisclaimer(disclaimerId: string, eventId: string, context?: any): Promise<void> {
    const disclaimer = this.disclaimers.find(d => d.id === disclaimerId);
    if (!disclaimer) return;

    const acknowledgment: DisclaimerAcknowledgment = {
      id: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      disclaimerId,
      sessionId: this.currentSessionId,
      acknowledgedAt: new Date(),
      context: JSON.stringify(context || {})
    };

    this.acknowledgments.unshift(acknowledgment);
    this.acknowledgments = this.acknowledgments.slice(0, 500); // Keep last 500 acknowledgments

    // Log compliance event
    const event: ComplianceEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: disclaimer.requiresAcknowledgment ? 'disclaimer_acknowledged' : 'disclaimer_dismissed',
      sessionId: this.currentSessionId,
      timestamp: new Date(),
      context: JSON.stringify(context || {}),
      details: {
        disclaimerId,
        acknowledgmentId: acknowledgment.id,
        originalEventId: eventId,
        wasRequired: disclaimer.requiresAcknowledgment
      }
    };

    this.complianceEvents.unshift(event);

    // Record in Recorder
    recorder.recordOracleSignal({
      type: disclaimer.requiresAcknowledgment ? 'compliance_disclaimer_acknowledged' : 'compliance_disclaimer_dismissed',
      signal: `Disclaimer ${disclaimer.requiresAcknowledgment ? 'acknowledged' : 'dismissed'}: ${disclaimer.title}`,
      data: {
        disclaimerId,
        acknowledgmentId: acknowledgment.id,
        wasRequired: disclaimer.requiresAcknowledgment
      }
    });

    // Emit acknowledgment event
    eventBus.emit('compliance.disclaimer_acknowledged', {
      disclaimer,
      acknowledgment,
      eventId: event.id
    });

    logService.log('info', `Disclaimer ${disclaimer.requiresAcknowledgment ? 'acknowledged' : 'dismissed'}`, {
      disclaimerId,
      acknowledgmentId: acknowledgment.id,
      wasRequired: disclaimer.requiresAcknowledgment
    });
  }

  // Handle trade intent creation
  private async handleTradeIntent(intent: any): Promise<void> {
    // Check if this requires additional risk warnings
    const riskFactors = this.assessTradeRisk(intent);
    
    if (riskFactors.length > 0) {
      const riskAck: RiskAcknowledgment = {
        id: `risk_${Date.now()}_${intent.symbol}`,
        type: 'large_position',
        title: 'High Risk Trade Detected',
        description: `This trade involves elevated risk factors: ${riskFactors.join(', ')}`,
        risks: [
          'Potential for significant financial loss',
          'Higher volatility than typical positions',
          'May exceed recommended position sizing',
          'Market conditions may be unfavorable'
        ],
        userConfirmation: 'I UNDERSTAND THE RISKS',
        acknowledged: false
      };

      eventBus.emit('compliance.risk_acknowledgment_required', {
        tradeIntent: intent,
        riskAcknowledgment: riskAck
      });
    }

    // Always show trade intent disclaimer
    const tradeDisclaimer = this.disclaimers.find(d => d.id === 'trade_intent_risk');
    if (tradeDisclaimer) {
      await this.showDisclaimer(tradeDisclaimer, { intent });
    }
  }

  // Assess risk factors for a trade
  private assessTradeRisk(intent: any): string[] {
    const risks: string[] = [];
    
    // Check position size
    const positionValue = intent.quantity * (intent.price || 100);
    if (positionValue > this.settings.riskThresholds.requireConfirmationAbove) {
      risks.push('large position size');
    }

    // Check for high volatility symbols (mock check)
    const highVolSymbols = ['TSLA', 'GME', 'AMC', 'NVDA'];
    if (highVolSymbols.includes(intent.symbol)) {
      risks.push('high volatility stock');
    }

    // Check market hours (mock check)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 9 || hour > 16) {
      risks.push('outside market hours');
    }

    return risks;
  }

  // Handle risk threshold exceeded
  private async handleRiskThresholdExceeded(data: any): Promise<void> {
    const riskDisclaimer = this.disclaimers.find(d => d.id === 'high_risk_warning');
    if (riskDisclaimer) {
      await this.showDisclaimer(riskDisclaimer, data);
    }
  }

  // Get legal footer for component
  getLegalFooter(component: string, variant: 'minimal' | 'standard' | 'detailed' = 'minimal'): LegalFooter | null {
    const footerContent = {
      minimal: 'Not financial advice. For informational purposes only.',
      standard: 'This information is for educational purposes only and does not constitute financial advice. Always conduct your own research.',
      detailed: 'StagAlgo provides market analysis tools for educational purposes only. This is not financial, investment, or trading advice. You are solely responsible for your investment decisions. Past performance does not guarantee future results. Trading involves substantial risk of loss.'
    };

    // Determine if footer should be shown for this component
    const showFooter = ['recommendations', 'oracle', 'analyst', 'market_search'].includes(component);
    
    if (!showFooter) return null;

    return {
      id: `footer_${component}_${variant}`,
      component,
      position: 'bottom',
      content: footerContent[variant],
      variant,
      showDismiss: variant === 'detailed'
    };
  }

  // Check subscription tier limits
  checkTierLimit(feature: string, currentUsage: number): { allowed: boolean; limit: number; remaining: number } {
    const limits = this.settings.subscriptionTier.limits;
    let limit = 0;
    
    switch (feature) {
      case 'watchlist':
        limit = limits.maxWatchlistItems;
        break;
      case 'saved_searches':
        limit = limits.maxSavedSearches;
        break;
      case 'daily_recommendations':
        limit = limits.maxDailyRecommendations;
        break;
      case 'analyst_queries':
        limit = limits.maxAnalystQueries;
        break;
      default:
        return { allowed: true, limit: -1, remaining: -1 };
    }

    const allowed = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage);

    if (!allowed) {
      // Log limit reached event
      const event: ComplianceEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'limit_reached',
        sessionId: this.currentSessionId,
        timestamp: new Date(),
        context: feature,
        details: {
          feature,
          currentUsage,
          limit,
          tier: this.settings.subscriptionTier.level
        }
      };

      this.complianceEvents.unshift(event);
      
      eventBus.emit('compliance.limit_reached', {
        feature,
        currentUsage,
        limit,
        tier: this.settings.subscriptionTier.level
      });
    }

    return { allowed, limit, remaining };
  }

  // Public API methods
  getComplianceSettings(): ComplianceSettings {
    return { ...this.settings };
  }

  updateComplianceSettings(updates: Partial<ComplianceSettings>): void {
    this.settings = { ...this.settings, ...updates };
    
    logService.log('info', 'Compliance settings updated', updates);
    eventBus.emit('compliance.settings_updated', this.settings);
  }

  getAcknowledgmentHistory(limit = 50): DisclaimerAcknowledgment[] {
    return this.acknowledgments.slice(0, limit);
  }

  getComplianceEvents(limit = 50): ComplianceEvent[] {
    return this.complianceEvents.slice(0, limit);
  }

  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  exportComplianceData(startDate?: Date, endDate?: Date): any {
    const filterByDate = (items: any[], dateField: string) => {
      if (!startDate && !endDate) return items;
      
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    };

    return {
      exportDate: new Date().toISOString(),
      sessionId: this.currentSessionId,
      settings: this.settings,
      acknowledgments: filterByDate(this.acknowledgments, 'acknowledgedAt'),
      complianceEvents: filterByDate(this.complianceEvents, 'timestamp'),
      disclaimers: this.disclaimers.map(d => ({
        id: d.id,
        type: d.type,
        title: d.title,
        severity: d.severity,
        requiresAcknowledgment: d.requiresAcknowledgment,
        frequency: d.frequency,
        contexts: d.contexts
      }))
    };
  }
}

// Export singleton
export const complianceService = new ComplianceService();