-- Create fetch_candles RPC for unified chart data access
create or replace function public.fetch_candles(
  _ws uuid,
  _symbol text,
  _tf text,
  _from timestamptz,
  _to timestamptz
)
returns table(ts timestamptz, o numeric, h numeric, l numeric, c numeric, v numeric, vwap numeric)
language sql
stable
security definer
set search_path = public
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

-- Index for efficient candle queries
create index if not exists ix_candles_ws_sym_tf_ts 
  on public.candles(workspace_id, symbol, tf, ts);

-- Temporary open read policy (tighten after confirming charts work)
drop policy if exists candles_open_read on public.candles;
create policy candles_open_read 
  on public.candles 
  for select 
  to authenticated 
  using (true);

-- Ensure ref_symbols has default market symbols
insert into public.ref_symbols(symbol, exchange, asset_class, active) values
  ('AAPL', 'NASDAQ', 'us_equity', true),
  ('MSFT', 'NASDAQ', 'us_equity', true),
  ('GOOGL', 'NASDAQ', 'us_equity', true),
  ('AMZN', 'NASDAQ', 'us_equity', true),
  ('META', 'NASDAQ', 'us_equity', true),
  ('TSLA', 'NASDAQ', 'us_equity', true),
  ('NVDA', 'NASDAQ', 'us_equity', true),
  ('SPY', 'ARCA', 'us_equity', true),
  ('QQQ', 'NASDAQ', 'us_equity', true),
  ('IWM', 'ARCA', 'us_equity', true)
on conflict (symbol) do update 
  set active = true, updated_at = now();