-- ============================================================================
-- Incremental fixes: Core infrastructure (minimal, no function replacement)
-- ============================================================================

-- 1. Canonical fetch_candles RPC (single source for all charts)
create or replace function public.fetch_candles(
  _ws uuid,
  _symbol text,
  _tf text,
  _from timestamptz,
  _to timestamptz
)
returns table(
  ts timestamptz,
  o numeric,
  h numeric,
  l numeric,
  c numeric,
  v numeric,
  vwap numeric
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select ts, o, h, l, c, v, vwap
  from public.candles
  where workspace_id = _ws
    and symbol = _symbol
    and tf = _tf
    and ts between _from and _to
  order by ts asc
  limit 5000;
$$;

-- 2. Clean up existing candles policies and add new ones
drop policy if exists "Members can access candles" on public.candles;
drop policy if exists "ws_read_candles" on public.candles;
drop policy if exists "ws_write_candles" on public.candles;
drop policy if exists "candles_member_read" on public.candles;
drop policy if exists "candles_member_write" on public.candles;
drop policy if exists "candles_member_update" on public.candles;

create policy "candles_member_read"
  on public.candles
  for select
  to authenticated
  using (is_member_of_workspace(workspace_id));

create policy "candles_member_write"
  on public.candles
  for insert
  to authenticated
  with check (is_member_of_workspace(workspace_id));

create policy "candles_member_update"
  on public.candles
  for update
  to authenticated
  using (is_member_of_workspace(workspace_id))
  with check (is_member_of_workspace(workspace_id));

-- 3. Add broker_health table for observability
create table if not exists public.broker_health (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  broker text not null,
  last_ok timestamptz,
  last_check timestamptz default now(),
  status text not null default 'unknown' check (status in ('ok','degraded','down','unknown')),
  error_message text,
  primary key (workspace_id, broker)
);

alter table public.broker_health enable row level security;

create policy "broker_health_member_read"
  on public.broker_health
  for select
  to authenticated
  using (is_member_of_workspace(workspace_id));

create policy "broker_health_member_write"
  on public.broker_health
  for insert
  to authenticated
  with check (is_member_of_workspace(workspace_id));

create policy "broker_health_member_update"
  on public.broker_health
  for update
  to authenticated
  using (is_member_of_workspace(workspace_id));

-- 4. Ensure ref_symbols has permissive read
drop policy if exists "Members can access symbols" on public.ref_symbols;
drop policy if exists "ref_symbols_public_read" on public.ref_symbols;

create policy "ref_symbols_public_read"
  on public.ref_symbols
  for select
  to authenticated
  using (true);

-- 5. Create index for faster candle queries
create index if not exists ix_candles_workspace_symbol_tf_ts
  on public.candles (workspace_id, symbol, tf, ts desc);

-- 6. Create helper to log sync events
create or replace function public.log_sync_event(
  _workspace_id uuid,
  _actor text,
  _event_type text,
  _payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _event_id uuid;
begin
  insert into public.rec_events (
    workspace_id,
    user_id,
    event_type,
    severity,
    entity_type,
    entity_id,
    summary,
    payload_json
  )
  values (
    _workspace_id,
    auth.uid(),
    _event_type,
    1,
    _actor,
    null,
    _event_type,
    _payload
  )
  returning id into _event_id;
  
  return _event_id;
end;
$$;