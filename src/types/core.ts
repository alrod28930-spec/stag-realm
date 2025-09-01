// Core Scaffold - Number Systems and Constants

// IDs & Versioning
export type EntityPrefix = 'usr_' | 'org_' | 'ws_' | 'bot_' | 'brk_' | 'orc_' | 'res_' | 'evt_' | 'qry_' | 'alrt_' | 'snap_' | 'news_' | 'csv_';

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  build?: string;
}

// Time & Windows
export type TradingWindow = 'intraday' | 'D1' | 'W1' | 'M1';
export type CandlePeriod = '1m' | '5m' | '15m' | '1h' | 'D1';
export type FreshnessLevel = 'live' | 'warm' | 'stale';

export interface FreshnessThresholds {
  live: { min: 0; max: 60 };    // 0-60 seconds
  warm: { min: 61; max: 300 };  // 61-300 seconds  
  stale: { min: 301; max: number }; // >300 seconds
}

// Boolean Gates & States
export enum BotToggleState {
  OFF = 0,
  SIMULATION = 1,
  LIVE = 2
}

export enum RiskKillState {
  NORMAL = 0,
  SOFT_PULL = 1,
  HARD_PULL = 2
}

// Scales
export type SignalStrength = number; // 0-1
export type Direction = -1 | 0 | 1;
export type RelevanceScore = number; // 0-1
export type BotConfidence = number; // 0-100
export type RiskState = number; // 0-100

export enum AlertSeverity {
  INFO = 1,
  WARN = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Formulas Components
export interface RelevanceComponents {
  signal_strength: number;
  portfolio_overlap: number;
  recency_weight: number;
  volatility_fit: number;
}

export interface RiskStateComponents {
  drawdown_norm: number;
  exposure_norm: number;
  vol_spike_norm: number;
  liquidity_norm: number;
  concentration_norm: number;
}

export interface ConfidenceComponents {
  signal_strength: number;
  bot_accuracy: number;
  trend_confirmation: number;
  volatility_regime_fit: number;
}

// Core Entity Interfaces
export interface CoreEntity {
  id: string; // ULID with entity prefix
  created_at: Date;
  updated_at: Date;
  version: string;
}

export interface TimestampedEntity {
  timestamp: Date;
  freshness: FreshnessLevel;
  age_seconds: number;
}

export interface ScoredEntity {
  strength: SignalStrength;
  direction: Direction;
  confidence: BotConfidence;
  relevance: RelevanceScore;
}

// System State
export interface SystemState {
  version: VersionInfo;
  uptime_seconds: number;
  market_state: 'open' | 'closed' | 'pre_market' | 'after_hours';
  risk_state: RiskState;
  feature_flags: Record<string, boolean>;
  last_refresh: Date;
}

// Performance Thresholds
export interface PerformanceThresholds {
  ui_response_p95_ms: 200;
  search_response_max_ms: 2000;
  refresh_interval_max_s: 60;
}

export type EventTopic = 'trade.intent' | 'trade.executed' | 'oracle.signal.created' | 'risk.soft_pull' | 'risk.hard_pull' | 'analyst.note' | 'alert.created' | 'bot.state.changed' | 'portfolio.updated' | 'market.data.received';

// Logic Layer States
export interface LogicLayerState {
  repository: {
    last_clean: Date;
    processed_feeds: number;
    rejected_stale: number;
    dedupe_count: number;
  };
  oracle: {
    active_signals: number;
    last_signal_generated: Date;
    signal_types: string[];
  };
  bid: {
    last_snapshot: Date;
    portfolio_value: number;
    risk_state: RiskState;
    exposure_count: number;
  };
  monarch: {
    active: boolean;
    last_decision: Date;
    soft_pulls_today: number;
    hard_pulls_today: number;
  };
  overseer: {
    active: boolean;
    positions_monitored: number;
    alerts_active: number;
  };
}