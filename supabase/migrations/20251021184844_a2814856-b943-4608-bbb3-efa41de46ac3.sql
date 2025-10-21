-- Phase III: Learning Hub, Adaptive Analyst, Safety

-- 1) Learning jobs (for online updates)
create table if not exists learning_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  job_type text not null check (job_type in ('oracle_online_update','bid_aggregate','analyst_tune')),
  status text not null default 'queued' check (status in ('queued','running','done','error')),
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text
);

-- 2) Analyst hyperparameters (tunable weights)
create table if not exists analyst_hparams (
  workspace_id uuid primary key,
  params jsonb not null default '{"w_win":0.5,"w_oracle":0.5,"risk_base":0.02,"risk_cap":0.03}'::jsonb
);

-- 3) Fast indexes for signals & events (using correct column names)
create index if not exists ix_oracle_signals_ws_sym_tf_ts
  on oracle_signals (workspace_id, symbol, tf, ts desc);

create index if not exists ix_bid_events_ws_ts
  on bid_learning_events (workspace_id, ts desc);

-- 4) RLS (same pattern as Phase II)
alter table learning_jobs enable row level security;
create policy learning_jobs_ws on learning_jobs
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=learning_jobs.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=learning_jobs.workspace_id and wm.user_id=auth.uid()));

alter table analyst_hparams enable row level security;
create policy analyst_hparams_ws on analyst_hparams
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=analyst_hparams.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=analyst_hparams.workspace_id and wm.user_id=auth.uid()));