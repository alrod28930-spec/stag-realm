-- Fix search_path for fetch_candles function
create or replace function fetch_candles(
  _ws uuid, _symbol text, _tf text, _from timestamptz, _to timestamptz
) returns table(ts timestamptz, o numeric, h numeric, l numeric, c numeric, v numeric, vwap numeric)
language sql stable
security definer
set search_path = public
as $$
  select ts,o,h,l,c,v,vwap
  from candles
  where workspace_id=_ws and symbol=_symbol and tf=_tf
    and ts between _from and _to
  order by ts asc
  limit 5000;
$$;