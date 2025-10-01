-- Fix critical RLS issues from linter

-- Enable RLS on idempotency_keys (internal table, service role only)
alter table if exists idempotency_keys enable row level security;

-- Enable RLS on recorder_mirror (workspace-scoped access)
alter table if exists recorder_mirror enable row level security;

-- Drop and recreate policies to handle conflicts
drop policy if exists recorder_mirror_member_read on recorder_mirror;
drop policy if exists recorder_mirror_member_write on recorder_mirror;

create policy recorder_mirror_member_read 
  on recorder_mirror for select to authenticated 
  using (is_member_of_workspace(workspace_id));

create policy recorder_mirror_member_write 
  on recorder_mirror for insert to authenticated 
  with check (is_member_of_workspace(workspace_id));