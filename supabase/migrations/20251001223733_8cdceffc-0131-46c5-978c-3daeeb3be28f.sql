-- Ensure idempotency_keys table exists
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz default now()
);

-- Add index for old key cleanup (optional housekeeping)
create index if not exists ix_idempotency_created
  on idempotency_keys (created_at);