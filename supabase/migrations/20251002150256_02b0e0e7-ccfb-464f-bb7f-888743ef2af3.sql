-- RPC + index for charts (with security definer)
create or replace function fetch_candles(
  _ws uuid, _symbol text, _tf text, _from timestamptz, _to timestamptz
) returns table(ts timestamptz, o numeric, h numeric, l numeric, c numeric, v numeric, vwap numeric)
language sql stable security definer set search_path = public as $$
  select ts,o,h,l,c,v,vwap
  from candles
  where workspace_id=_ws and symbol=_symbol and tf=_tf and ts between _from and _to
  order by ts asc
  limit 5000;
$$;

create index if not exists ix_candles_ws_sym_tf_ts on candles (workspace_id, symbol, tf, ts);

-- TEMP RLS: allow reading so charts render (tighten later)
alter table candles enable row level security;
drop policy if exists candles_open_read on candles;
create policy candles_open_read on candles for select to authenticated using (true);

-- Minimal helpers (idempotent)
create table if not exists ref_symbols (symbol text primary key, exchange text, active boolean default true);
create table if not exists recorder_mirror (id bigserial primary key, workspace_id uuid not null, actor text not null, event_type text not null, ref text, payload jsonb, ts timestamptz default now());
create table if not exists idempotency_keys (key text primary key, created_at timestamptz default now());

-- Seed symbols (avoids FK-type errors)
insert into ref_symbols(symbol,exchange) values ('AAPL','NASDAQ'),('QQQ','NASDAQ'),('META','NASDAQ'),('SPY','NYSE')
on conflict (symbol) do nothing;