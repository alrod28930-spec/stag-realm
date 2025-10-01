-- Oracle schema hardening: ref_symbols whitelist + improved signals table

-- Ensure ref_symbols has active flag
ALTER TABLE ref_symbols 
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Insert market indices + common symbols if not present
INSERT INTO ref_symbols (symbol, exchange, asset_class, active) VALUES
  ('SPY', 'NYSE', 'ETF', true),
  ('QQQ', 'NASDAQ', 'ETF', true),
  ('IWM', 'NYSE', 'ETF', true),
  ('DIA', 'NYSE', 'ETF', true),
  ('VTI', 'NYSE', 'ETF', true),
  ('AGG', 'NYSE', 'ETF', true),
  ('AAPL', 'NASDAQ', 'STOCK', true),
  ('MSFT', 'NASDAQ', 'STOCK', true),
  ('GOOGL', 'NASDAQ', 'STOCK', true),
  ('META', 'NASDAQ', 'STOCK', true),
  ('TSLA', 'NASDAQ', 'STOCK', true)
ON CONFLICT (symbol) DO NOTHING;

-- Update oracle_signals: add new columns
ALTER TABLE oracle_signals ADD COLUMN IF NOT EXISTS tf text DEFAULT '1D';
ALTER TABLE oracle_signals ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE oracle_signals ADD COLUMN IF NOT EXISTS value numeric;
ALTER TABLE oracle_signals ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

-- Backfill old rows
UPDATE oracle_signals SET name = signal_type WHERE name IS NULL;
UPDATE oracle_signals SET value = strength WHERE value IS NULL;

-- Remove duplicates: keep only the most recent row per (workspace_id, symbol, tf, ts, name)
DELETE FROM oracle_signals a
USING oracle_signals b
WHERE a.id > b.id
  AND a.workspace_id = b.workspace_id
  AND a.symbol = b.symbol
  AND COALESCE(a.tf, '1D') = COALESCE(b.tf, '1D')
  AND a.ts = b.ts
  AND COALESCE(a.name, a.signal_type) = COALESCE(b.name, b.signal_type);

-- Set NOT NULL after backfill
ALTER TABLE oracle_signals ALTER COLUMN tf SET NOT NULL;
ALTER TABLE oracle_signals ALTER COLUMN name SET NOT NULL;

-- Drop old PK and create new one
ALTER TABLE oracle_signals DROP CONSTRAINT IF EXISTS oracle_signals_pkey;
ALTER TABLE oracle_signals 
  ADD CONSTRAINT oracle_signals_pkey 
  PRIMARY KEY (workspace_id, symbol, tf, ts, name);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS ix_signals_ws_sym_tf_ts 
  ON oracle_signals(workspace_id, symbol, tf, ts);

-- Add FK to ref_symbols (ensures symbol exists in whitelist)
ALTER TABLE oracle_signals DROP CONSTRAINT IF EXISTS oracle_signals_symbol_fkey;
ALTER TABLE oracle_signals
  ADD CONSTRAINT oracle_signals_symbol_fkey 
  FOREIGN KEY (symbol) REFERENCES ref_symbols(symbol) ON DELETE CASCADE;

-- Same FK for candles
ALTER TABLE candles DROP CONSTRAINT IF EXISTS candles_symbol_fkey;
ALTER TABLE candles
  ADD CONSTRAINT candles_symbol_fkey 
  FOREIGN KEY (symbol) REFERENCES ref_symbols(symbol) ON DELETE CASCADE;