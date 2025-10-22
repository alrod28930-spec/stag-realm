-- Enable RLS on candles table
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;

-- Add debug read policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname='candles_read_debug' AND tablename='candles'
  ) THEN
    CREATE POLICY candles_read_debug ON candles 
    FOR SELECT TO authenticated 
    USING (true);
  END IF;
END$$;

-- Add composite index for efficient candle lookups
CREATE INDEX IF NOT EXISTS ix_candles_ws_sym_tf_ts 
ON candles (workspace_id, symbol, tf, ts);