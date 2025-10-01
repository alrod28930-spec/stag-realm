-- RPC to power all charts
create or replace function fetch_candles(
  _ws uuid, _symbol text, _tf text, _from timestamptz, _to timestamptz
) returns table(ts timestamptz, o numeric, h numeric, l numeric, c numeric, v numeric, vwap numeric)
language sql stable as $$
  select ts,o,h,l,c,v,vwap
  from candles
  where workspace_id=_ws and symbol=_symbol and tf=_tf
    and ts between _from and _to
  order by ts asc
  limit 5000;
$$;

-- Performance index
create index if not exists ix_candles_ws_sym_tf_ts
  on candles (workspace_id, symbol, tf, ts);

-- TEMP RLS policy so charts can read immediately (tighten later)
alter table candles enable row level security;
drop policy if exists candles_open_read on candles;
create policy candles_open_read
on candles for select to authenticated using (true);

-- Seed symbols so foreign keys don't fail
insert into ref_symbols(symbol,exchange) values
('AAPL','NASDAQ'),('QQQ','NASDAQ'),('META','NASDAQ'),('SPY','NYSE')
on conflict (symbol) do nothing;