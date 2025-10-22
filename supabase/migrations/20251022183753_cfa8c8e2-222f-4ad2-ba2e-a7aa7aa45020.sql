-- Stores the user's connection to a broker
create table if not exists broker_links (
  workspace_id uuid not null,
  broker text not null,
  mode text not null check (mode in ('paper','live')),
  status text not null default 'disconnected' check (status in ('connected','disconnected','error','testing')),
  last_ok timestamptz,
  meta jsonb not null default '{}'::jsonb,
  primary key (workspace_id, broker, mode)
);

-- Simple health cache so UI can render a badge fast
create table if not exists broker_health (
  workspace_id uuid not null,
  broker text not null,
  mode text not null,
  status text not null default 'unknown' check (status in ('ok','degraded','down','unknown')),
  last_check timestamptz default now(),
  error_message text,
  primary key (workspace_id, broker, mode)
);

-- Enable RLS
alter table broker_links enable row level security;
alter table broker_health enable row level security;

-- RLS policies
create policy broker_links_ws on broker_links
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=broker_links.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=broker_links.workspace_id and wm.user_id=auth.uid()));

create policy broker_health_ws on broker_health
for all using (exists (select 1 from workspace_members wm where wm.workspace_id=broker_health.workspace_id and wm.user_id=auth.uid()))
with check (exists (select 1 from workspace_members wm where wm.workspace_id=broker_health.workspace_id and wm.user_id=auth.uid()));