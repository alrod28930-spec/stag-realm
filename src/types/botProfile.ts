export type DailyTargetMode = '1p' | '2p' | '5p' | '10p';
export type StopStyle = 'wide' | 'standard' | 'tight' | 'very_tight';

export interface BotProfile {
  workspace_id: string;
  capital_risk_pct: number;
  daily_return_target_pct: number;
  execution_mode: 'manual' | 'automated';
  risk_indicator: 'low' | 'medium' | 'high';
  daily_target_mode: DailyTargetMode;
  max_trades_per_day: number;
  risk_per_trade_pct: number;
  rr_min: number;
  stop_style: StopStyle;
  signal_confidence_min: number;
  min_volume_usd: number;
  max_concurrent_positions: number;
  daily_loss_halt_pct: number;
  updated_at: string;
  
  // Intraday trading fields
  intraday_enabled?: boolean;
  intraday_max_trades?: number;
  intraday_time_window?: string;
  intraday_stop_style?: string;
  intraday_rr_min?: number;
  intraday_min_volume_usd?: number;
  intraday_blackout_json?: {
    pre_open: number;
    pre_close: number;
  };
  pdt_guard?: boolean;
  intraday_daily_loss_halt_pct?: number;
}

export interface BotProfileUpdate {
  capital_risk_pct?: number;
  daily_return_target_pct?: number;
  execution_mode?: 'manual' | 'automated';
  risk_indicator?: 'low' | 'medium' | 'high';
  daily_target_mode?: DailyTargetMode;
  max_trades_per_day?: number;
  risk_per_trade_pct?: number;
  rr_min?: number;
  stop_style?: StopStyle;
  signal_confidence_min?: number;
  min_volume_usd?: number;
  max_concurrent_positions?: number;
  daily_loss_halt_pct?: number;
  
  // Intraday trading fields
  intraday_enabled?: boolean;
  intraday_max_trades?: number;
  intraday_time_window?: string;
  intraday_stop_style?: string;
  intraday_rr_min?: number;
  intraday_min_volume_usd?: number;
  intraday_blackout_json?: {
    pre_open: number;
    pre_close: number;
  };
  pdt_guard?: boolean;
  intraday_daily_loss_halt_pct?: number;
}

export interface RiskGoalsSettings {
  capitalRisk: number;
  dailyTarget: number;
  executionMode: 'manual' | 'automated';
  dailyTargetMode: DailyTargetMode;
}

export interface ComplianceAcknowledgment {
  id?: string;
  user_id: string;
  workspace_id: string;
  document_type: string;
  version: string;
  acknowledged_at?: string;
  ip_address?: string;
  user_agent?: string;
}