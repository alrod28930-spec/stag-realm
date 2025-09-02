-- StagAlgo Complete Backend Schema
-- Extensions and helper functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Helper function for updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

-- Custom types
CREATE TYPE public.workspace_role AS ENUM ('owner','admin','member','viewer');
CREATE TYPE public.plan_tier AS ENUM ('lite','standard','pro','elite');

-- Auth profiles (mirror auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Multi-tenant workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_workspaces_updated_at 
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Recorder system (event ledger)
CREATE TABLE public.rec_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  severity SMALLINT NOT NULL DEFAULT 1,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT,
  payload_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX rec_events_workspace_ts_idx ON public.rec_events (workspace_id, ts DESC);
CREATE INDEX rec_events_workspace_type_ts_idx ON public.rec_events (workspace_id, event_type, ts DESC);
CREATE INDEX rec_events_payload_gin_idx ON public.rec_events USING gin (payload_json);

CREATE TABLE public.rec_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  range_start TIMESTAMPTZ,
  range_end TIMESTAMPTZ,
  format TEXT CHECK (format IN ('csv','pdf')) NOT NULL,
  status TEXT CHECK (status IN ('queued','processing','ready','failed')) NOT NULL DEFAULT 'queued',
  file_url TEXT
);

CREATE INDEX rec_exports_workspace_created_idx ON public.rec_exports (workspace_id, created_at DESC);

-- BID system tables
CREATE TABLE public.ref_symbols (
  symbol TEXT PRIMARY KEY,
  exchange TEXT, 
  asset_class TEXT, 
  sector TEXT, 
  industry TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.candles (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL REFERENCES public.ref_symbols(symbol),
  tf TEXT NOT NULL, 
  ts TIMESTAMPTZ NOT NULL,
  o NUMERIC, 
  h NUMERIC, 
  l NUMERIC, 
  c NUMERIC, 
  v NUMERIC, 
  vwap NUMERIC,
  PRIMARY KEY (workspace_id, symbol, tf, ts)
);

CREATE INDEX candles_workspace_symbol_tf_ts_idx ON public.candles (workspace_id, symbol, tf, ts DESC);

CREATE TABLE public.indicators (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL REFERENCES public.ref_symbols(symbol),
  tf TEXT NOT NULL, 
  ts TIMESTAMPTZ NOT NULL,
  ma20 NUMERIC, 
  ma50 NUMERIC, 
  ma200 NUMERIC, 
  rsi14 NUMERIC, 
  macd NUMERIC, 
  atr14 NUMERIC,
  bb_up NUMERIC, 
  bb_dn NUMERIC, 
  vwap_sess NUMERIC,
  PRIMARY KEY (workspace_id, symbol, tf, ts)
);

CREATE TABLE public.portfolio_current (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  equity NUMERIC, 
  cash NUMERIC, 
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.positions_current (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL REFERENCES public.ref_symbols(symbol),
  qty NUMERIC NOT NULL, 
  avg_cost NUMERIC NOT NULL,
  mv NUMERIC, 
  unr_pnl NUMERIC, 
  r_pnl NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol)
);

-- Risk system
CREATE TABLE public.risk_portfolio (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  dd_pct NUMERIC, 
  beta NUMERIC, 
  var_95 NUMERIC, 
  es_95 NUMERIC,
  concentration_top NUMERIC, 
  liquidity_score NUMERIC,
  risk_state INTEGER,
  PRIMARY KEY (workspace_id, ts)
);

CREATE INDEX risk_portfolio_workspace_ts_idx ON public.risk_portfolio (workspace_id, ts DESC);

CREATE TABLE public.risk_positions (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL REFERENCES public.ref_symbols(symbol),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  beta_sym NUMERIC, 
  adv_pct NUMERIC, 
  spread_est NUMERIC,
  stop_suggest NUMERIC, 
  tp_suggest NUMERIC,
  PRIMARY KEY (workspace_id, symbol, ts)
);

CREATE TABLE public.risk_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  per_trade_risk_pct NUMERIC DEFAULT 0.02,
  sector_exposure_cap_pct NUMERIC DEFAULT 0.15,
  daily_drawdown_halt_pct NUMERIC DEFAULT 0.03,
  min_price NUMERIC DEFAULT 5, 
  min_trade_usd NUMERIC DEFAULT 500,
  leverage_cap NUMERIC DEFAULT 1.0,
  soft_pull_enabled BOOLEAN DEFAULT true,
  hard_pull_enabled BOOLEAN DEFAULT true,
  blacklist_enforced BOOLEAN DEFAULT true,
  exposure_limits_enabled BOOLEAN DEFAULT true,
  gains_rr_ratio NUMERIC DEFAULT 2.0,
  profit_lock_trailing BOOLEAN DEFAULT true,
  partial_exit_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_risk_settings_updated_at 
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TABLE public.blacklists (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL REFERENCES public.ref_symbols(symbol),
  reason TEXT, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol)
);

-- Signals and recommendations
CREATE TABLE public.oracle_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT REFERENCES public.ref_symbols(symbol),
  signal_type TEXT NOT NULL, 
  strength NUMERIC NOT NULL, 
  direction SMALLINT NOT NULL,
  source TEXT, 
  ts TIMESTAMPTZ NOT NULL DEFAULT now(), 
  summary TEXT
);

CREATE INDEX oracle_signals_workspace_ts_idx ON public.oracle_signals (workspace_id, ts DESC);
CREATE INDEX oracle_signals_workspace_symbol_ts_idx ON public.oracle_signals (workspace_id, symbol, ts DESC);

CREATE TABLE public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  query_text TEXT, 
  filters_json JSONB, 
  notify BOOLEAN DEFAULT false,
  created_ts TIMESTAMPTZ NOT NULL DEFAULT now(), 
  last_run_ts TIMESTAMPTZ
);

CREATE TABLE public.search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  query_id UUID NOT NULL REFERENCES public.search_queries(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL, 
  relevance_score NUMERIC, 
  features_json JSONB, 
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX search_results_workspace_query_ts_idx ON public.search_results (workspace_id, query_id, ts DESC);

CREATE TABLE public.recommendations (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL, 
  score NUMERIC,
  reason_bullets JSONB, 
  related_event_ids UUID[] DEFAULT '{}',
  last_update_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol)
);

-- Subscriptions (Stripe mirror)
CREATE TABLE public.subscriptions (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'lite',
  status TEXT NOT NULL DEFAULT 'active',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  renewal_date DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function for workspace membership check
CREATE OR REPLACE FUNCTION public.is_member_of_workspace(w_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w_id AND m.user_id = auth.uid()
  )
$$;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Workspaces
CREATE POLICY "Members can view workspaces" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m 
      WHERE m.workspace_id = id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Workspace members
CREATE POLICY "Members can view workspace memberships" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage memberships" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner','admin')
    )
  );

-- Workspace-scoped tables (apply same pattern to all)
CREATE POLICY "Members can read events" ON public.rec_events
  FOR SELECT USING (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can insert events" ON public.rec_events
  FOR INSERT WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can manage exports" ON public.rec_exports
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

-- Apply workspace access pattern to all workspace-scoped tables
CREATE POLICY "Members can access symbols" ON public.ref_symbols FOR ALL USING (true);

CREATE POLICY "Members can access candles" ON public.candles
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access indicators" ON public.indicators
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access portfolio" ON public.portfolio_current
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access positions" ON public.positions_current
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access risk portfolio" ON public.risk_portfolio
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access risk positions" ON public.risk_positions
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access risk settings" ON public.risk_settings
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access blacklists" ON public.blacklists
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access oracle signals" ON public.oracle_signals
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access search queries" ON public.search_queries
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access search results" ON public.search_results
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access recommendations" ON public.recommendations
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

CREATE POLICY "Members can access subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_member_of_workspace(workspace_id))
  WITH CHECK (public.is_member_of_workspace(workspace_id));

-- Standardized logging RPC function
CREATE OR REPLACE FUNCTION public.recorder_log(
  p_workspace UUID, 
  p_event_type TEXT, 
  p_severity SMALLINT,
  p_entity_type TEXT, 
  p_entity_id TEXT, 
  p_summary TEXT, 
  p_payload JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  v_id UUID;
BEGIN
  INSERT INTO public.rec_events (
    workspace_id, user_id, event_type, severity, 
    entity_type, entity_id, summary, payload_json
  )
  VALUES (
    p_workspace, auth.uid(), p_event_type, COALESCE(p_severity,1), 
    p_entity_type, p_entity_id, p_summary, COALESCE(p_payload,'{}'::jsonb)
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.recorder_log(UUID,TEXT,SMALLINT,TEXT,TEXT,TEXT,JSONB) TO authenticated;