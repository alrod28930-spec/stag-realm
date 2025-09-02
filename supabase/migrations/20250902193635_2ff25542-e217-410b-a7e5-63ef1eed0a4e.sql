-- Strategy Library Tables for Trade Bot System

-- PLAYBOOKS: what to trade and how to enter/exit
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  setup_rules_json JSONB NOT NULL,
  confirm_rules_json JSONB NOT NULL,
  exit_rules_json JSONB NOT NULL,
  rr_default NUMERIC NOT NULL,
  stop_style TEXT NOT NULL CHECK (stop_style IN ('wide','standard','tight','very_tight')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIZING formulas and constraints
CREATE TABLE IF NOT EXISTS sizing_strategies (
  name TEXT PRIMARY KEY,
  formula TEXT NOT NULL,
  constraints_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MANAGEMENT rules (move to BE, trail, partials)
CREATE TABLE IF NOT EXISTS management_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup TEXT NOT NULL,
  triggers_json JSONB NOT NULL,
  actions_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- REGIME detection (trend/range, vol/liquidity state)
CREATE TABLE IF NOT EXISTS regime_signals (
  ts TIMESTAMPTZ NOT NULL,
  symbol_class TEXT NOT NULL,
  features_json JSONB NOT NULL,
  regime_label TEXT NOT NULL,
  PRIMARY KEY (ts, symbol_class)
);

-- EVENT calendar & blackout rules
CREATE TABLE IF NOT EXISTS market_events (
  ts TIMESTAMPTZ NOT NULL,
  symbol TEXT,
  event_type TEXT NOT NULL,
  severity SMALLINT DEFAULT 1,
  blackout_rules_json JSONB,
  PRIMARY KEY (ts, event_type, COALESCE(symbol,'*'))
);

-- EXECUTION tactics (microstructure-aware order tactics)
CREATE TABLE IF NOT EXISTS execution_tactics (
  name TEXT PRIMARY KEY,
  venue_rules_json JSONB,
  size_buckets_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NICHE edges (advanced optional setups)
CREATE TABLE IF NOT EXISTS niche_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  hypothesis TEXT,
  detection_rules_json JSONB NOT NULL,
  guardrails_json JSONB,
  backtest_notes TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for all tables (global read access for now)
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizing_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_tactics ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_edges ENABLE ROW LEVEL SECURITY;

-- Global read policies (can be restricted later)
CREATE POLICY "Global read access to playbooks" ON playbooks FOR SELECT USING (true);
CREATE POLICY "Global read access to sizing strategies" ON sizing_strategies FOR SELECT USING (true);
CREATE POLICY "Global read access to management rules" ON management_rules FOR SELECT USING (true);
CREATE POLICY "Global read access to regime signals" ON regime_signals FOR SELECT USING (true);
CREATE POLICY "Global read access to market events" ON market_events FOR SELECT USING (true);
CREATE POLICY "Global read access to execution tactics" ON execution_tactics FOR SELECT USING (true);
CREATE POLICY "Global read access to niche edges" ON niche_edges FOR SELECT USING (true);

-- Seed PLAYBOOKS
INSERT INTO playbooks (name, description, setup_rules_json, confirm_rules_json, exit_rules_json, rr_default, stop_style) VALUES
('Momentum_Pullback', 'Enter on pullback in strong trending stock', 
 '{"trend_requirement": "20MA > 50MA", "pullback_depth": "0.382-0.618 fib", "volume_requirement": "above 20d avg"}',
 '{"rsi": "<30", "support_test": "true", "volume_surge": ">1.5x avg"}',
 '{"stop": "below swing low", "tp1": "previous high", "trail": "after 1R"}',
 2.5, 'standard'),

('ORB_Breakout', 'Opening Range Breakout with volume confirmation',
 '{"time_window": "first 30min", "range_size": "0.5-2.0% of price", "premarket_context": "required"}',
 '{"breakout_volume": ">2x avg", "follow_through": "sustained 5min", "no_fakeout": "true"}',
 '{"stop": "opposite side of range", "tp1": "range_size projection", "time_stop": "2hrs"}',
 2.0, 'tight'),

('Breakout_Retest', 'Enter on successful retest of breakout level',
 '{"initial_breakout": "completed", "retest_timeframe": "within 2-5 bars", "volume_profile": "declining on retest"}',
 '{"support_hold": "true", "bullish_rejection": "hammer/doji", "volume_pickup": "on bounce"}',
 '{"stop": "below retest low", "tp1": "initial target", "trail": "break-even after 1R"}',
 3.0, 'standard'),

('VWAP_Reversion', 'Mean reversion trade back to VWAP',
 '{"distance_from_vwap": ">1.5 ATR", "trend_context": "not in strong trend", "time_of_day": "avoid first/last hour"}',
 '{"oversold_rsi": "<30 or >70", "volume_climax": "true", "vwap_magnet": "price action shows attraction"}',
 '{"stop": "1 ATR beyond entry", "tp1": "VWAP", "tp2": "opposite side if momentum"}',
 2.0, 'wide'),

('Inside_Day_Break', 'Breakout from inside day compression',
 '{"pattern": "inside day or inside bar", "volume": "below average during compression", "context": "after trending move"}',
 '{"breakout_direction": "with trend or range break", "volume_confirmation": ">1.5x avg", "follow_through": "immediate"}',
 '{"stop": "opposite extreme", "tp1": "pattern height projection", "trail": "after 1.5R"}',
 2.5, 'standard'),

('ATR_Channel_Bounce', 'Trade bounces off ATR-based dynamic support/resistance',
 '{"channel": "20MA ± 2*ATR", "test_count": "2-4 touches", "trend_alignment": "preferred"}',
 '{"rejection_candle": "hammer/shooting star", "volume": "above average", "rsi_divergence": "optional"}',
 '{"stop": "beyond channel", "tp1": "opposite channel", "partial": "at midpoint"}',
 2.0, 'wide'),

('2B_Reversal', 'Failed breakout reversal pattern',
 '{"false_breakout": "new high/low that fails", "volume": "declining on extension", "context": "overextended move"}',
 '{"reversal_signal": "engulfing or key reversal", "volume_surge": "on reversal", "momentum_shift": "clear"}',
 '{"stop": "beyond failed extreme", "tp1": "previous support/resistance", "tp2": "50% retracement"}',
 3.0, 'tight'),

('Scalp_LiquidityBurst', 'Quick scalp on liquidity events',
 '{"catalyst": "news/earnings/data release", "spread": "<5bps", "volume": ">3x average"}',
 '{"momentum": "clear direction", "participation": "institutional flow", "timing": "within 2min of event"}',
 '{"stop": "0.3 ATR", "tp1": "1.5x stop", "time_limit": "5min max hold"}',
 1.5, 'very_tight');

-- Seed SIZING STRATEGIES
INSERT INTO sizing_strategies (name, formula, constraints_json) VALUES
('fixed_fractional', 'position_size = (equity * risk_pct) / stop_loss_distance',
 '{"min_trade_usd": 500, "max_position_pct": 0.1, "leverage_cap": 1.0}'),
 
('atr_fractional', 'position_size = (equity * risk_pct) / (atr * atr_multiplier)',
 '{"min_trade_usd": 500, "atr_period": 14, "atr_multiplier": 2.0, "max_position_pct": 0.08}'),
 
('kelly_lite', 'position_size = (win_rate * avg_win - loss_rate * avg_loss) / avg_loss * equity * kelly_fraction',
 '{"kelly_fraction": 0.25, "min_trades_for_calc": 20, "lookback_days": 60, "max_position_pct": 0.05}');

-- Seed EXECUTION TACTICS
INSERT INTO execution_tactics (name, venue_rules_json, size_buckets_json) VALUES
('spread_aware_limit', 
 '{"preferred_venues": ["NYSE", "NASDAQ"], "routing": "smart", "post_only": false}',
 '{"small": {"max_size": 5000, "tactic": "limit_at_bid_ask"}, "medium": {"max_size": 20000, "tactic": "limit_with_post"}, "large": {"max_size": 999999, "tactic": "iceberg_display"}}'),
 
('breakout_stop_limit',
 '{"aggressive_routing": true, "liquidity_seeking": true, "speed_priority": true}',
 '{"any_size": {"tactic": "stop_limit", "offset": "0.05", "time_in_force": "IOC"}}'),
 
('large_order_twap',
 '{"dark_pools": true, "participation_rate": 0.15, "minimum_fill": 100}',
 '{"large_only": {"min_size": 50000, "tactic": "twap", "duration_minutes": 15}}');

-- Seed NICHE EDGES
INSERT INTO niche_edges (name, hypothesis, detection_rules_json, guardrails_json, backtest_notes, enabled) VALUES
('PEAD', 'Post-Earnings Announcement Drift continues for several days',
 '{"earnings_beat": ">5%", "surprise_direction": "positive", "days_since": "1-5", "no_guidance_cut": true}',
 '{"avoid_if": {"market_stressed": true, "sector_rotation": true, "low_volume": "<0.5x avg"}}',
 'Works best in bull markets, avoid during earnings season crowding', false),

('Power_Hour', 'Institutional activity creates momentum in final trading hour',
 '{"time_window": "15:00-16:00 ET", "volume_surge": ">2x avg", "directional_flow": "consistent"}',
 '{"avoid_if": {"opex_friday": true, "major_news_pending": true, "low_float": "<50M shares"}}',
 'Best performance on Tue-Thu, avoid on Mondays and Fridays', false),

('TwoSession_VWAP_Pinch', 'Price compression between Asian and US VWAP creates breakout setup',
 '{"vwap_spread": "<0.5 ATR", "session_overlap": "7:00-9:30 ET", "compression_time": ">2 hours"}',
 '{"avoid_if": {"earnings_week": true, "fed_day": true, "low_adv": "<$50M"}}',
 'Experimental - limited sample size, needs more validation', false);

-- Seed basic REGIME SIGNALS (stub data)
INSERT INTO regime_signals (ts, symbol_class, features_json, regime_label) VALUES
(NOW() - INTERVAL '1 hour', 'equity_largecap', '{"adx": 25, "atrp": 0.015, "range_score": 0.3}', 'trend'),
(NOW() - INTERVAL '1 hour', 'equity_smallcap', '{"adx": 18, "atrp": 0.025, "range_score": 0.7}', 'range'),
(NOW() - INTERVAL '1 hour', 'forex_majors', '{"adx": 30, "atrp": 0.008, "range_score": 0.2}', 'trend');

-- Seed upcoming MARKET EVENTS (examples)
INSERT INTO market_events (ts, symbol, event_type, severity, blackout_rules_json) VALUES
(NOW() + INTERVAL '2 days', NULL, 'CPI', 3, '{"no_trade_minutes_before": 30, "after": 15}'),
(NOW() + INTERVAL '7 days', NULL, 'FOMC', 4, '{"no_trade_minutes_before": 60, "after": 30}'),
(NOW() + INTERVAL '14 days', NULL, 'opex', 2, '{"reduced_size": 0.5, "avoid_0dte": true}');

-- Seed MANAGEMENT RULES for each playbook
INSERT INTO management_rules (setup, triggers_json, actions_json) VALUES
('Momentum_Pullback', 
 '[{"when": "RR >= 1.0", "condition": "price_action_favorable"}, {"when": "time > 4hrs", "condition": "no_progress"}]',
 '[{"do": "trail_stop", "params": {"method": "ATR", "multiplier": 1.5}}, {"do": "time_exit", "params": {"reason": "stale"}}]'),
 
('ORB_Breakout',
 '[{"when": "RR >= 0.75", "condition": "strong_momentum"}, {"when": "time > 2hrs", "condition": "always"}]',
 '[{"do": "move_to_breakeven"}, {"do": "exit_full", "params": {"reason": "time_limit"}}]'),
 
('Scalp_LiquidityBurst',
 '[{"when": "RR >= 1.0", "condition": "immediate"}, {"when": "time > 5min", "condition": "always"}]',
 '[{"do": "exit_full", "params": {"reason": "target_hit"}}, {"do": "exit_full", "params": {"reason": "time_limit"}}]');