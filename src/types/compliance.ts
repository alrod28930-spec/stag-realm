// Compliance and Disclaimer Types

export interface DisclaimerType {
  id: string;
  type: 'session_start' | 'trade_intent' | 'recommendation' | 'risk_warning' | 'general';
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  requiresAcknowledgment: boolean;
  frequency: 'once' | 'daily' | 'per_session' | 'always';
  contexts: DisclaimerContext[];
}

export interface DisclaimerContext {
  component: 'analyst' | 'oracle' | 'trade_bots' | 'recommendations' | 'market_search';
  action?: 'view' | 'interact' | 'execute' | 'save';
  priority: number; // Higher = more prominent
}

export interface DisclaimerAcknowledgment {
  id: string;
  disclaimerId: string;
  userId?: string;
  sessionId: string;
  acknowledgedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  context: string;
}

export interface ComplianceSettings {
  disclaimersEnabled: boolean;
  requireAcknowledgments: boolean;
  logAllInteractions: boolean;
  riskThresholds: RiskThresholds;
  subscriptionTier: SubscriptionTier;
  brokerComplianceMode: boolean;
}

export interface RiskThresholds {
  maxDailyLoss: number; // Percentage
  maxPositionSize: number; // Percentage of portfolio
  volatilityWarningLevel: number; // VIX level
  concentrationWarningLevel: number; // Portfolio concentration
  requireConfirmationAbove: number; // Dollar amount
}

export interface SubscriptionTier {
  level: 'lite' | 'standard' | 'pro' | 'elite';
  name: string;
  features: string[];
  limits: TierLimits;
  complianceLevel: 'basic' | 'enhanced' | 'professional';
}

export interface TierLimits {
  maxWatchlistItems: number;
  maxSavedSearches: number;
  maxDailyRecommendations: number;
  maxAnalystQueries: number;
  recordExportEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  customDisclaimersEnabled: boolean;
}

export interface ComplianceEvent {
  id: string;
  type: 'disclaimer_shown' | 'disclaimer_acknowledged' | 'risk_warning' | 'feature_accessed' | 'limit_reached';
  userId?: string;
  sessionId: string;
  timestamp: Date;
  context: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RiskAcknowledgment {
  id: string;
  type: 'high_volatility' | 'large_position' | 'concentration_risk' | 'market_hours' | 'leverage';
  title: string;
  description: string;
  risks: string[];
  userConfirmation: string; // What user must type to confirm
  acknowledgedAt?: Date;
  acknowledged: boolean;
}

export interface LegalFooter {
  id: string;
  component: string;
  position: 'top' | 'bottom' | 'inline';
  content: string;
  variant: 'minimal' | 'standard' | 'detailed';
  showDismiss: boolean;
}