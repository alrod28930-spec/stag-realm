// System Constants and Thresholds

import { FreshnessThresholds, PerformanceThresholds } from '@/types/core';

// Version Information
export const SYSTEM_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: 'scaffold-alpha'
};

// Entity Prefixes
export const ENTITY_PREFIXES = {
  USER: 'usr_',
  ORGANIZATION: 'org_',
  WORKSPACE: 'ws_',
  BOT: 'bot_',
  BROKER: 'brk_',
  ORACLE: 'orc_',
  RESULT: 'res_',
  EVENT: 'evt_',
  QUERY: 'qry_',
  ALERT: 'alrt_'
} as const;

// Event Topics
export const EVENT_TOPICS = {
  TRADE_INTENT: 'trade.intent',
  TRADE_EXECUTED: 'trade.executed',
  ORACLE_SIGNAL_CREATED: 'oracle.signal.created',
  RISK_SOFT_PULL: 'risk.soft_pull',
  RISK_HARD_PULL: 'risk.hard_pull',
  ANALYST_NOTE: 'analyst.note',
  ALERT_CREATED: 'alert.created',
  BOT_STATE_CHANGED: 'bot.state.changed',
  PORTFOLIO_UPDATED: 'portfolio.updated',
  MARKET_DATA_RECEIVED: 'market.data.received'
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  TRADING_HOURS_START: 9.5, // 9:30 AM
  TRADING_HOURS_END: 16,     // 4:00 PM
  MARKET_DAYS_PER_WEEK: 5
} as const;

// Freshness Thresholds
export const FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  live: { min: 0, max: 60 },
  warm: { min: 61, max: 300 },
  stale: { min: 301, max: Infinity }
};

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  ui_response_p95_ms: 200,
  search_response_max_ms: 2000,
  refresh_interval_max_s: 60
};

// Formula Weights
export const FORMULA_WEIGHTS = {
  RELEVANCE: {
    SIGNAL_STRENGTH: 0.45,
    PORTFOLIO_OVERLAP: 0.25,
    RECENCY_WEIGHT: 0.20,
    VOLATILITY_FIT: 0.10
  },
  RISK_STATE: {
    DRAWDOWN_NORM: 0.35,
    EXPOSURE_NORM: 0.25,
    VOL_SPIKE_NORM: 0.20,
    LIQUIDITY_NORM: 0.10,
    CONCENTRATION_NORM: 0.10
  },
  CONFIDENCE: {
    SIGNAL_STRENGTH: 0.40,
    BOT_ACCURACY: 0.25,
    TREND_CONFIRMATION: 0.20,
    VOLATILITY_REGIME_FIT: 0.15
  }
} as const;

// Scale Bounds
export const SCALE_BOUNDS = {
  SIGNAL_STRENGTH: { min: 0, max: 1 },
  DIRECTION: { values: [-1, 0, 1] },
  RELEVANCE_SCORE: { min: 0, max: 1 },
  BOT_CONFIDENCE: { min: 0, max: 100 },
  RISK_STATE: { min: 0, max: 100 },
  ALERT_SEVERITY: { min: 1, max: 4 }
} as const;

// Trading Windows
export const TRADING_WINDOWS = {
  INTRADAY: { duration_hours: 6.5, label: 'Intraday' },
  D1: { duration_hours: 24, label: 'Daily' },
  W1: { duration_hours: 168, label: 'Weekly' },
  M1: { duration_hours: 720, label: 'Monthly' }
} as const;

// Candle Periods
export const CANDLE_PERIODS = {
  '1m': { minutes: 1, label: '1 Minute' },
  '5m': { minutes: 5, label: '5 Minutes' },
  '15m': { minutes: 15, label: '15 Minutes' },
  '1h': { minutes: 60, label: '1 Hour' },
  'D1': { minutes: 1440, label: 'Daily' }
} as const;

// Risk Thresholds
export const RISK_THRESHOLDS = {
  SOFT_PULL_THRESHOLD: 65,
  HARD_PULL_THRESHOLD: 85,
  MAX_DAILY_TRADES_PER_BOT: 10,
  MAX_POSITION_SIZE_PERCENT: 10,
  MAX_SECTOR_EXPOSURE_PERCENT: 25,
  MAX_DAILY_DRAWDOWN_PERCENT: 5,
  MIN_STOCK_PRICE: 5.00,
  MIN_CONFIDENCE_THRESHOLD: 60
} as const;

// System Limits
export const SYSTEM_LIMITS = {
  MAX_CONCURRENT_BOTS: 20,
  MAX_SIGNALS_PER_SYMBOL: 50,
  MAX_RECORDER_ENTRIES_HOT: 10000,
  MAX_SEARCH_RESULTS: 100,
  MAX_RECOMMENDATIONS: 10,
  MAX_ALERT_HISTORY: 1000
} as const;

// Default Values
export const DEFAULT_VALUES = {
  BOT_ALLOCATION: 1000,
  BOT_RISK_TOLERANCE: 0.5,
  STOP_LOSS_PERCENT: 5,
  TAKE_PROFIT_PERCENT: 10,
  MAX_HOLD_TIME_HOURS: 24,
  REFRESH_INTERVAL_MS: 30000
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_LIVE_TRADING: false,
  ENABLE_ORACLE_SIGNALS: true,
  ENABLE_RISK_GOVERNORS: true,
  ENABLE_COMPLIANCE_MODE: true,
  ENABLE_ADVANCED_ANALYTICS: false,
  ENABLE_EXPORT_FEATURES: true,
  ENABLE_SAVED_SEARCHES: true,
  ENABLE_NOTIFICATIONS: true
} as const;