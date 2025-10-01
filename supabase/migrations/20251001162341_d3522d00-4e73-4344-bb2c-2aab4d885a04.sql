-- Candles RPC for all charts
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

-- Minimal order writer (server-side validated upstream)
create or replace function create_order_record(
  _ws uuid, _run uuid, _symbol text, _side text, _qty numeric,
  _limits jsonb, _validator_status text, _broker_status text
) returns uuid language plpgsql as $$
declare new_id uuid := gen_random_uuid();
begin
  insert into orders(id, workspace_id, run_id, symbol, side, qty, limits, validator_status, broker_status)
  values(new_id, _ws, _run, _symbol, _side, _qty, _limits, _validator_status, _broker_status);
  return new_id;
end;
$$;

-- RLS: enable + TEMP open-read for candles (tighten later)
alter table candles enable row level security;
drop policy if exists candles_open_read on candles;
create policy candles_open_read
on candles for select to authenticated using (true);