-- ============================================================================
-- Risk Governor Infrastructure
-- ============================================================================

-- 1. Risk policies table (workspace-level trading limits)
create table if not exists public.risk_policies (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  max_notional_per_trade numeric not null default 1000,          -- $ max per trade
  max_positions integer not null default 5,                      -- max concurrent positions
  max_trades_per_day integer not null default 20,                -- max trades per day
  max_daily_loss_pct numeric not null default 0.05,              -- 5% max daily loss
  cooldown_after_loss_secs integer not null default 180,         -- 3 min cooldown after loss
  require_stop_loss boolean not null default true,               -- mandate SL on all orders
  allow_premarket boolean not null default false,                -- allow pre-market trading
  allow_postmarket boolean not null default false,               -- allow post-market trading
  min_liquidity_volume numeric not null default 500000,          -- min daily volume (shares)
  max_spread_pct numeric not null default 0.005,                 -- 0.5% max spread
  market_data_freshness_ms integer not null default 120000,      -- 2 min max stale
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.risk_policies enable row level security;

create policy "risk_policies_member_read"
  on public.risk_policies
  for select
  to authenticated
  using (is_member_of_workspace(workspace_id));

create policy "risk_policies_member_write"
  on public.risk_policies
  for insert
  to authenticated
  with check (is_member_of_workspace(workspace_id));

create policy "risk_policies_member_update"
  on public.risk_policies
  for update
  to authenticated
  using (is_member_of_workspace(workspace_id))
  with check (is_member_of_workspace(workspace_id));

-- 2. Risk counters table (daily tracking per workspace)
create table if not exists public.risk_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  day date not null,
  trades integer not null default 0,
  losses integer not null default 0,
  wins integer not null default 0,
  total_pnl numeric not null default 0,
  last_loss_at timestamptz,
  last_trade_at timestamptz,
  primary key (workspace_id, day)
);

alter table public.risk_counters enable row level security;

create policy "risk_counters_member_read"
  on public.risk_counters
  for select
  to authenticated
  using (is_member_of_workspace(workspace_id));

create policy "risk_counters_member_write"
  on public.risk_counters
  for insert
  to authenticated
  with check (is_member_of_workspace(workspace_id));

create policy "risk_counters_member_update"
  on public.risk_counters
  for update
  to authenticated
  using (is_member_of_workspace(workspace_id));

-- 3. Create index for faster counter lookups
create index if not exists ix_risk_counters_workspace_day
  on public.risk_counters (workspace_id, day desc);

-- 4. Helper function to get or create today's counter
create or replace function public.get_risk_counter(
  _workspace_id uuid,
  _day date
)
returns public.risk_counters
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _counter public.risk_counters;
begin
  -- Get existing counter
  select * into _counter
  from public.risk_counters
  where workspace_id = _workspace_id
    and day = _day;
  
  -- Create if not exists
  if not found then
    insert into public.risk_counters (workspace_id, day)
    values (_workspace_id, _day)
    returning * into _counter;
  end if;
  
  return _counter;
end;
$$;

-- 5. Helper function to increment trade counter
create or replace function public.increment_trade_counter(
  _workspace_id uuid,
  _is_loss boolean,
  _pnl numeric
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _today date := current_date;
begin
  insert into public.risk_counters (
    workspace_id,
    day,
    trades,
    losses,
    wins,
    total_pnl,
    last_loss_at,
    last_trade_at
  )
  values (
    _workspace_id,
    _today,
    1,
    case when _is_loss then 1 else 0 end,
    case when not _is_loss then 1 else 0 end,
    _pnl,
    case when _is_loss then now() else null end,
    now()
  )
  on conflict (workspace_id, day) do update set
    trades = risk_counters.trades + 1,
    losses = risk_counters.losses + case when _is_loss then 1 else 0 end,
    wins = risk_counters.wins + case when not _is_loss then 1 else 0 end,
    total_pnl = risk_counters.total_pnl + _pnl,
    last_loss_at = case when _is_loss then now() else risk_counters.last_loss_at end,
    last_trade_at = now();
end;
$$;

-- 6. Add updated_at trigger to risk_policies
create trigger trg_risk_policies_updated
  before update on public.risk_policies
  for each row
  execute function public.update_updated_at_column();