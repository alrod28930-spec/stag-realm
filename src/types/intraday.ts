// Intraday Trading Types
export type IntradayStopStyle = 'standard' | 'tight' | 'very_tight';

export interface IntradaySettings {
  intraday_enabled: boolean;
  intraday_max_trades: number;
  intraday_time_window: string; // HH:MM-HH:MM format
  intraday_stop_style: IntradayStopStyle;
  intraday_rr_min: number;
  intraday_min_volume_usd: number;
  intraday_blackout_json: {
    pre_open: number;
    pre_close: number;
  };
  pdt_guard: boolean;
  intraday_daily_loss_halt_pct: number;
}

export interface IntradaySession {
  workspace_id: string;
  symbol_class: string;
  tz: string;
  open_time: string; // HH:MM format
  close_time: string; // HH:MM format
}

// Intraday parameter presets by Daily Target Mode
export const INTRADAY_PRESETS: Record<string, Partial<IntradaySettings>> = {
  '1p': {
    intraday_max_trades: 4,
    intraday_stop_style: 'tight',
    intraday_rr_min: 2.0,
    intraday_min_volume_usd: 2000000,
    intraday_daily_loss_halt_pct: 0.5
  },
  '2p': {
    intraday_max_trades: 6,
    intraday_stop_style: 'tight',
    intraday_rr_min: 1.8,
    intraday_min_volume_usd: 1500000,
    intraday_daily_loss_halt_pct: 0.75
  },
  '5p': {
    intraday_max_trades: 10,
    intraday_stop_style: 'very_tight',
    intraday_rr_min: 1.5,
    intraday_min_volume_usd: 1000000,
    intraday_daily_loss_halt_pct: 1.0
  },
  '10p': {
    intraday_max_trades: 15,
    intraday_stop_style: 'very_tight',
    intraday_rr_min: 1.2,
    intraday_min_volume_usd: 750000,
    intraday_daily_loss_halt_pct: 1.0
  }
};

export interface IntradayConstraints {
  timeGuard: boolean;
  maxTrades: boolean;
  liquidityCheck: boolean;
  rrRequirement: boolean;
  pdtGuard: boolean;
  sessionHalt: boolean;
}