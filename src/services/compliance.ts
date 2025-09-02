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
        id: 'portfolio_mirroring_eula',
        type: 'session_start',
        title: 'End User License Agreement - Portfolio Mirroring Software',
        content: `**STAGALGO PORTFOLIO MIRRORING SOFTWARE**

**CRITICAL UNDERSTANDING**: StagAlgo is exclusively a portfolio mirroring and analytics software tool. By using this software, you acknowledge and agree:

**SOFTWARE LICENSE ONLY**:
• You are licensing software, NOT purchasing financial services
• StagAlgo NEVER holds, custodies, or controls your funds
• All assets remain in YOUR brokerage account at ALL times
• We are NOT a broker, dealer, custodian, or investment advisor

**PORTFOLIO MIRRORING MODEL**:
• StagAlgo connects to your external brokerage via YOUR API keys
• We mirror/analyze your positions for educational purposes only
• Any trade suggestions are simulated or require YOUR execution at YOUR broker
• Your brokerage account and funds remain completely separate and safe

**NO CUSTODY, NO CONTROL**:
• We NEVER process deposits, withdrawals, or hold client money
• If StagAlgo fails, your brokerage account remains unaffected
• You maintain full control of your actual trading account

**EDUCATIONAL PURPOSE ONLY**:
• All analysis, recommendations, and insights are educational
• No guarantees of profitability or trading success
• Past performance does not predict future results
• Trading involves substantial risk of capital loss

**YOUR RESPONSIBILITIES**:
• You are solely responsible for ALL trading decisions
• You must conduct your own due diligence
• Consider consulting qualified financial advisors
• Understand and accept all trading risks

**LIMITATION OF LIABILITY**:
• StagAlgo owner/operator assumes NO responsibility for:
  - Trading losses or missed opportunities
  - System downtime or data inaccuracies  
  - Market volatility or external factors
  - User errors or misunderstanding of features

This structure protects both parties: your funds stay safe at your broker while you benefit from our analytical tools.

**BY CONTINUING, YOU CONFIRM**: You understand this is SOFTWARE ONLY and you remain in complete control of your own brokerage account and trading decisions.`,
        severity: 'critical',
        requiresAcknowledgment: true,
        frequency: 'daily',
        contexts: [
          { component: 'analyst', priority: 1 },
          { component: 'oracle', priority: 1 },
          { component: 'trade_bots', priority: 1 },
          { component: 'recommendations', priority: 1 }
        ]
      },
      {
        id: 'portfolio_mirroring_confirmation',
        type: 'trade_intent',
        title: 'Portfolio Mirroring - Trade Intent Confirmation',
        content: `**IMPORTANT: PORTFOLIO MIRRORING MODEL**

You are creating a trade intent in our portfolio mirroring system. Please confirm your understanding:

**THIS IS SIMULATION/ANALYSIS ONLY**:
• This creates a mirrored position in our analytics system
• NO actual trade is executed automatically
• NO money moves from your brokerage account
• This is for analysis, tracking, and educational purposes

**YOUR BROKERAGE REMAINS SEPARATE**:
• Your actual funds stay at YOUR chosen broker (Alpaca, OANDA, etc.)
• To execute this trade, YOU must place it manually at YOUR broker
• StagAlgo never touches your real money or executes real trades
• We only mirror the position for analytics and learning

**PORTFOLIO MIRRORING BENEFITS**:
• Track hypothetical performance alongside your real portfolio
• Learn from AI analysis without risking real capital
• Test strategies before committing real funds
• Compare simulated vs actual performance

**YOUR RESPONSIBILITY**:
• Any real trades must be executed by YOU at YOUR broker
• You control all actual money movement and risk
• Use our analysis as educational input for your decisions
• All trading risks and outcomes are yours alone

**RISK REMINDER**: Even simulated trades teach real lessons about market volatility and risk. Use this educational tool to improve your trading knowledge.

By proceeding, you confirm this is portfolio mirroring for educational analysis only.`,
        severity: 'warning',
        requiresAcknowledgment: true,
        frequency: 'always',
        contexts: [
          { component: 'trade_bots', action: 'execute', priority: 1 }
        ]
      },
      {
        id: 'portfolio_mirroring_footer',
        type: 'recommendation',
        title: 'Portfolio Mirroring Educational Tool',
        content: 'Portfolio mirroring analysis for educational purposes only. Not financial advice. StagAlgo does not custody funds or execute trades. Your broker account remains separate and under your control.',
        severity: 'info',
        requiresAcknowledgment: false,
        frequency: 'always',
        contexts: [
          { component: 'recommendations', action: 'view', priority: 3 },
          { component: 'oracle', action: 'view', priority: 3 },
          { component: 'analyst', action: 'view', priority: 3 }
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
        id: 'privacy_policy_notice',
        type: 'general',
        title: 'Privacy Policy - Minimal Data Collection',
        content: `**DATA MINIMIZATION POLICY**

StagAlgo collects only essential data to provide portfolio mirroring services:

**WHAT WE COLLECT**:
• Workspace settings and preferences
• Portfolio analytics and usage logs
• API keys you provide (stored encrypted, never shared)
• Basic session information for compliance

**WHAT WE DON'T COLLECT**:
• Your brokerage login credentials (never stored)
• Personal financial information beyond portfolio positions
• Unnecessary personal data or marketing profiles

**DATA PROTECTION**:
• API keys encrypted with industry-standard security
• Data used only to provide our software service
• No data reselling or sharing with third parties
• GDPR-compliant deletion rights upon request

**YOUR CONTROL**:
• You can delete your account and all data anytime
• API keys can be revoked at your brokerage
• Portfolio data mirrors what you choose to share

This minimal data approach protects your privacy while enabling our portfolio mirroring analytics.`,
        severity: 'info',
        requiresAcknowledgment: false,
        frequency: 'once',
        contexts: [
          { component: 'market_search', action: 'view', priority: 2 }
        ]
      },
      {
        id: 'regulatory_compliance_shield',
        type: 'general',
        title: 'Regulatory Compliance Framework',
        content: `**REGULATORY POSITIONING**

StagAlgo operates under a compliance framework designed to protect users:

**NOT A FINANCIAL SERVICE PROVIDER**:
• We provide software tools, not financial services
• No broker-dealer registration required (funds never custodied)
• No investment advisor registration (educational content only)
• Clear separation from regulated financial activities

**USER PROTECTION MODEL**:
• Your funds always remain at YOUR regulated broker
• Your broker provides SIPC insurance and regulatory protection
• StagAlgo cannot access or move your actual money
• If our software fails, your brokerage account is unaffected

**COMPLIANCE FEATURES**:
• All user interactions logged for audit purposes
• Risk warnings and acknowledgments tracked
• Clear disclaimers about software-only nature
• Educational purpose statements throughout

**REGULATORY SHIELD**:
This structure protects you by ensuring:
• Your money stays with regulated, insured brokers
• Our software cannot create financial liability for user losses  
• Clear legal boundaries prevent regulatory overreach
• Educational software classification avoids financial service rules

This framework provides maximum user protection while enabling powerful portfolio analytics.`,
        severity: 'info',
        requiresAcknowledgment: false,
        frequency: 'once',
        contexts: [
          { component: 'analyst', action: 'view', priority: 2 }
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
        if (disclaimer.id === 'portfolio_mirroring_eula') {
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
    if (disclaimer.id === 'portfolio_mirroring_eula') {
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
    const tradeDisclaimer = this.disclaimers.find(d => d.id === 'portfolio_mirroring_confirmation');
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
      minimal: 'Portfolio mirroring software for educational use only. Not financial advice. Your funds remain at your broker.',
      standard: 'StagAlgo is portfolio mirroring software for educational purposes only. This is not financial advice. We do not custody funds or execute trades. You maintain complete control of your brokerage account.',
      detailed: 'StagAlgo provides portfolio mirroring and market analysis tools for educational purposes only. This is not financial, investment, or trading advice. We are not a broker-dealer or custodian. Your funds remain at your external broker under your complete control. You are solely responsible for your investment decisions. Past performance does not guarantee future results. Trading involves substantial risk of loss.'
    };

    // Show footer for all financial components
    const showFooter = ['recommendations', 'oracle', 'analyst', 'market_search', 'trade_bots', 'portfolio'].includes(component);
    
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