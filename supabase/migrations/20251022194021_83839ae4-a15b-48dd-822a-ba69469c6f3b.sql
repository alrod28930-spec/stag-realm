-- Seed safe defaults for analyst hparams (if missing)
insert into analyst_hparams (workspace_id, params)
select wm.workspace_id, jsonb_build_object(
  'base_risk_pct', 0.02,
  'risk_cap', 0.03,
  'size_boost_cap', 0.01,
  'size_cut_cap', 0.01,
  'max_portfolio_risk_pct', 0.10,
  'w_win', 0.5,
  'w_oracle', 0.5,
  'risk_base', 0.02
)
from workspace_members wm
where not exists (select 1 from analyst_hparams ah where ah.workspace_id = wm.workspace_id)
on conflict do nothing;

-- Enable debug read policy on candles if not exists
do $$
begin
  if not exists (select 1 from pg_policies where policyname='candles_read_debug' and tablename='candles') then
    create policy candles_read_debug on candles for select to authenticated using (true);
  end if;
end$$;

create index if not exists ix_candles_ws_sym_tf_ts on candles (workspace_id, symbol, tf, ts);