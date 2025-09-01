export interface BrokerConfig {
  apiKey: string;
  secretKey: string;
  brokerName: string;
  isActive: boolean;
}

export interface RiskControls {
  maxPositionSize: number;
  maxDailyLoss: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxOpenPositions: number;
}

export interface TradeFilters {
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  allowedSymbols: string[];
  blockedSymbols: string[];
}

export interface LicensingTier {
  tier: 'Basic' | 'Pro' | 'Enterprise';
  features: string[];
  maxBots: number;
  realTimeData: boolean;
  advancedAnalytics: boolean;
}

export interface AppSettings {
  brokerConfigs: BrokerConfig[];
  licensing: LicensingTier;
  riskControls: RiskControls;
  tradeFilters: TradeFilters;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    tradingAlerts: boolean;
  };
  display: {
    theme: 'dark' | 'light';
    currency: string;
    timeFormat: '12h' | '24h';
    chartType: 'candlestick' | 'line';
  };
}