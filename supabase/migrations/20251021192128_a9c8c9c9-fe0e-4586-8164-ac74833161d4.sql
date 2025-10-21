-- Phase V: RL Policy Improvement + Ensemble Oracle + Shadow A/B

-- 1) Policies (candidate strategies / parameter sets)
create table if not exists rl_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  params jsonb not null,
  status text not null default 'candidate' check (status in ('candidate','shadow','active','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) RL results per policy (online/offline eval)
create table if not exists rl_policy_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  policy_id uuid not null,
  time_window text not null,
  trades int not null default 0,
  win_rate numeric not null default 0,
  pnl_bp numeric not null default 0,
  avg_rr numeric not null default 0,
  sharpe numeric,
  created_at timestamptz default now()
);

-- 3) Ensemble members for Oracle
create table if not exists oracle_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  weight numeric not null default 0.25,
  enabled boolean not null default true,
  params jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 4) A/B experiments registry
create table if not exists ab_experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  a_policy_id uuid not null,
  b_policy_id uuid not null,
  status text not null default 'running' check (status in ('running','stopped','promoted')),
  started_at timestamptz default now(),
  stopped_at timestamptz
);

-- RLS policies
alter table rl_policies enable row level security;
create policy rl_policies_ws on rl_policies
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=rl_policies.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=rl_policies.workspace_id and wm.user_id=auth.uid()));

alter table rl_policy_results enable row level security;
create policy rl_policy_results_ws on rl_policy_results
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=rl_policy_results.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=rl_policy_results.workspace_id and wm.user_id=auth.uid()));

alter table oracle_models enable row level security;
create policy oracle_models_ws on oracle_models
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=oracle_models.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=oracle_models.workspace_id and wm.user_id=auth.uid()));

alter table ab_experiments enable row level security;
create policy ab_experiments_ws on ab_experiments
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=ab_experiments.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=ab_experiments.workspace_id and wm.user_id=auth.uid()));

-- Indexes for performance
create index if not exists idx_rl_policy_results_ws_policy_ts on rl_policy_results(workspace_id, policy_id, created_at desc);
create index if not exists idx_oracle_models_ws_enabled on oracle_models(workspace_id, enabled);
create index if not exists idx_ab_experiments_ws_status on ab_experiments(workspace_id, status);