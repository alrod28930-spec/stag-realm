-- TEMP policy to unblock charts while wiring
alter table candles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'candles_read_debug'
      and tablename = 'candles'
  ) then
    create policy candles_read_debug
      on candles for select to authenticated
      using (true);
  end if;
end$$;

create index if not exists ix_candles_ws_sym_tf_ts
  on candles (workspace_id, symbol, tf, ts);