-- Add Daily Target Mode columns to bot_profiles
ALTER TABLE bot_profiles 
  ADD COLUMN IF NOT EXISTS daily_target_mode text NOT NULL DEFAULT '1p',
  ADD COLUMN IF NOT EXISTS max_trades_per_day int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS risk_per_trade_pct numeric NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS rr_min numeric NOT NULL DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS stop_style text NOT NULL DEFAULT 'wide',
  ADD COLUMN IF NOT EXISTS signal_confidence_min numeric NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS min_volume_usd numeric NOT NULL DEFAULT 2000000,
  ADD COLUMN IF NOT EXISTS max_concurrent_positions int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS daily_loss_halt_pct numeric NOT NULL DEFAULT 0.5;