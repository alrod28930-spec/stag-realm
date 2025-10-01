-- ============================================================================
-- Bot Trading Infrastructure
-- ============================================================================

-- 1. Strategies table (bot templates/configs)
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  kind text not null check (kind in ('momentum','mean_reversion','breakout','risk_arbitrage','custom')),
  params jsonb not null default '{}',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategies enable row level security;

create policy "strategies_member_read"
  on public.strategies
  for select
  to authenticated
  using (is_member_of_workspace(workspace_id));

create policy "strategies_member_write"
  on public.strategies
  for insert
  to authenticated
  with check (is_member_of_workspace(workspace_id) and auth.uid() = owner_user_id);

create policy "strategies_member_update"
  on public.strategies
  for update
  to authenticated
  using (is_member_of_workspace(workspace_id))
  with check (is_member_of_workspace(workspace_id));

-- 2. Strategy runs table (bot instances)
-- Note: strategy_runs already exists, just need to ensure it has the right structure
-- The existing table has the columns we need based on the summary

-- 3. Add updated_at trigger to strategies
create trigger trg_strategies_updated
  before update on public.strategies
  for each row
  execute function public.update_updated_at_column();

-- 4. Create index for active runs
create index if not exists ix_strategy_runs_active
  on public.strategy_runs (workspace_id, status)
  where status in ('research', 'paper', 'live');