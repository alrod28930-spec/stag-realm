-- Clean duplicate connection before adding unique constraint
-- Delete all but the oldest connection per (workspace_id, provider)
DELETE FROM public.connections_brokerages c1
WHERE EXISTS (
  SELECT 1 FROM public.connections_brokerages c2
  WHERE c1.workspace_id = c2.workspace_id
    AND c1.provider = c2.provider
    AND c1.created_at > c2.created_at
);

-- Add 'mode' column with default 'paper' and NOT NULL
ALTER TABLE public.connections_brokerages
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'paper' NOT NULL;

-- Relax NOT NULL constraints on encrypted credential fields to allow phased writes
ALTER TABLE public.connections_brokerages
ALTER COLUMN api_key_cipher DROP NOT NULL,
ALTER COLUMN api_secret_cipher DROP NOT NULL,
ALTER COLUMN nonce DROP NOT NULL;

-- Add unique constraint for workspace/provider/mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' 
      AND indexname='connections_brokerages_ws_provider_mode_uniq'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX connections_brokerages_ws_provider_mode_uniq ON public.connections_brokerages (workspace_id, provider, mode)';
  END IF;
END $$;