-- Create orders table only (simple approach)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    CREATE TABLE public.orders (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null,
      run_id uuid,
      symbol text not null,
      side text not null check (side in ('buy','sell')),
      qty numeric not null check (qty > 0),
      price numeric,
      limits jsonb default '{}',
      validator_status text not null check (validator_status in ('pass','fail')),
      validator_reason text,
      broker_status text not null check (broker_status in ('proposed','placed','filled','canceled','rejected','error')),
      broker_order_id text,
      filled_qty numeric default 0,
      filled_avg_price numeric,
      ts_created timestamptz not null default now(),
      ts_updated timestamptz not null default now()
    );

    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    CREATE INDEX ix_orders_ws_run ON public.orders(workspace_id, run_id, ts_created desc);
    CREATE INDEX ix_orders_ws_symbol ON public.orders(workspace_id, symbol, ts_created desc);
  END IF;
END $$;

-- RLS policies for orders
DROP POLICY IF EXISTS "orders_member_read" ON public.orders;
CREATE POLICY "orders_member_read"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (is_member_of_workspace(workspace_id));

DROP POLICY IF EXISTS "orders_member_write" ON public.orders;
CREATE POLICY "orders_member_write"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_workspace(workspace_id));

DROP POLICY IF EXISTS "orders_member_update" ON public.orders;
CREATE POLICY "orders_member_update"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (is_member_of_workspace(workspace_id));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create feature_flags if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_flags') THEN
    CREATE TABLE public.feature_flags (
      workspace_id uuid primary key,
      flags jsonb not null default '{"live_trading":false,"oracle_refresh_fast":false,"bots_default":true,"learning_enabled":false}'::jsonb,
      updated_at timestamptz not null default now()
    );

    ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- RLS for feature_flags
DROP POLICY IF EXISTS "feature_flags_member_read" ON public.feature_flags;
CREATE POLICY "feature_flags_member_read"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (is_member_of_workspace(workspace_id));

DROP POLICY IF EXISTS "feature_flags_member_write" ON public.feature_flags;
CREATE POLICY "feature_flags_member_write"
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_workspace(workspace_id));