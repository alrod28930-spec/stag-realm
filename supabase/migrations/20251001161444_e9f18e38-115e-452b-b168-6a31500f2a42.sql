-- Chart data core: RPC function, indexes, and helper tables

-- Candles RPC for all charts (fast indexed access)
create or replace function fetch_candles(
  _ws uuid, _symbol text, _tf text, _from timestamptz, _to timestamptz
) returns table(ts timestamptz, o numeric, h numeric, l numeric, c numeric, v numeric, vwap numeric)
language sql stable security definer set search_path = public as $$
  select ts, o, h, l, c, v, vwap
  from candles
  where workspace_id = _ws 
    and symbol = _symbol 
    and tf = _tf
    and ts between _from and _to
  order by ts asc
  limit 5000;
$$;

-- Critical index for candles performance
create index if not exists ix_candles_ws_sym_tf_ts 
  on candles (workspace_id, symbol, tf, ts);

-- Idempotency table (prevent duplicate orders)
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz default now()
);

-- Recorder mirror for events (if not exists)
create table if not exists recorder_mirror (
  id bigserial primary key,
  workspace_id uuid not null,
  actor text not null,
  event_type text not null,
  ref text,
  payload jsonb,
  ts timestamptz default now()
);
create index if not exists ix_recorder_ws_ts on recorder_mirror(workspace_id, ts desc);

-- Order creation RPC (server-side validated)
create or replace function create_order_record(
  _ws uuid, _run uuid, _symbol text, _side text, _qty numeric,
  _limits jsonb, _validator_status text, _broker_status text
) returns uuid language plpgsql security definer set search_path = public as $$
declare 
  new_id uuid := gen_random_uuid();
begin
  insert into orders(id, workspace_id, run_id, symbol, side, qty, limits, validator_status, broker_status)
  values(new_id, _ws, _run, _symbol, _side, _qty, _limits, _validator_status, _broker_status);
  return new_id;
end;
$$;

-- Temporary open read policy for charts (tighten after verification)
drop policy if exists candles_open_read on candles;
create policy candles_open_read on candles
  for select to authenticated using (true);

-- Ensure ref_symbols has default stocks
insert into ref_symbols (symbol, exchange, active)
values 
  ('AAPL', 'NASDAQ', true),
  ('QQQ', 'NASDAQ', true),
  ('META', 'NASDAQ', true),
  ('SPY', 'NYSE', true),
  ('NVDA', 'NASDAQ', true),
  ('TSLA', 'NASDAQ', true)
on conflict (symbol) do nothing;