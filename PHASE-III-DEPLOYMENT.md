# StagAlgo Phase III: Adaptive Analyst + Learning Hub + Safety

## Overview

Phase III extends the Phase II stack (Analyst v2, BID v2, Oracle v2) to make the system adaptive and self-improving without external LLMs. The system now features:

- **Learning Hub**: Automatic job queuing based on system activity
- **Oracle Online Update**: Lightweight adaptive scoring using recent outcomes
- **Analyst Auto-Tune**: Adjusts hyperparameters based on performance
- **Backtest Engine**: Tests deterministic strategies on historical data
- **Safety Layer**: Validation, idempotency, and risk clamping

## New Tables

All tables use workspace-scoped RLS policies for security.

### `learning_jobs`
Tracks background learning and optimization tasks:
- `workspace_id`, `job_type`, `status`, `payload`
- Job types: 'oracle_online_update' | 'bid_aggregate' | 'analyst_tune'
- Status: 'queued' | 'running' | 'done' | 'error'

### `analyst_hparams`
Stores tunable hyperparameters per workspace:
- `workspace_id` (primary key)
- `params`: JSONB with default `{"w_win":0.5,"w_oracle":0.5,"risk_base":0.02,"risk_cap":0.03}`

## Edge Functions

### `learning-hub-sync` (unauthenticated)
Reads `repository_events`, enqueues learning jobs based on activity.

**Trigger:** Hourly cron (recommended: every hour)

**Request:** No body required

**Response:**
```json
{
  "ok": true,
  "queued": 2
}
```

### `oracle-online-update` (unauthenticated)
Small online updates to `oracle_signal_scores` using recent outcomes.

**Trigger:** Every 10 minutes during market hours

**Request:** No body required

**Response:**
```json
{
  "ok": true,
  "updated": 5
}
```

### `analyst-auto-tune` (unauthenticated)
Adjusts `analyst_hparams` from outcomes (win rate, avg RR).

**Trigger:** Nightly at 01:40 UTC

**Request:** No body required

**Response:**
```json
{
  "ok": true,
  "tuned": true,
  "params": {
    "w_win": 0.52,
    "w_oracle": 0.48,
    "risk_base": 0.021,
    "risk_cap": 0.03
  }
}
```

### `backtest-run` (authenticated)
Runs deterministic plan over historical window.

**Request:**
```json
{
  "symbol": "SPY",
  "tf": "1H",
  "fromISO": "2024-09-01T00:00:00Z",
  "toISO": "2024-09-15T23:59:59Z"
}
```

**Response:**
```json
{
  "ok": true,
  "symbol": "SPY",
  "tf": "1H",
  "result": {
    "trades": 12,
    "win_rate": 0.58,
    "pnl_bp": 320,
    "avg_rr": 1.15
  }
}
```

## Analyst v2 Enhancements

The `analyst-core-v2` function now includes:

1. **Feature Flags**: Loads `agent_feature_flags` for workspace-level settings
2. **Hyperparameters**: Loads `analyst_hparams` for tuned weights
3. **Validation**: Uses `validator(plan, flags)` from `_shared/safety.ts`
4. **Idempotency**: Generates idempotency keys to prevent duplicate orders
5. **Event Recording**: Logs all plans to `repository_events`

## Shared Utilities

### `_shared/safety.ts`
- `idempotencyKey(parts)`: Generates hash-based idempotency keys
- `clamp(n, lo, hi)`: Clamps values within range
- `validator(plan, flags)`: Validates plans against risk policies

### `_shared/metrics.ts`
- `recordEvent(supabase, workspace_id, source, payload)`: Records events to `repository_events`

## Scheduler Configuration

Add to Supabase → Database → Cron Jobs:

### 1. Oracle Online Update (Every 10 min, market hours)
```sql
select cron.schedule(
  'oracle-online-update',
  '*/10 9-16 * * 1-5', -- Every 10 min, 9am-4pm Mon-Fri (adjust for timezone)
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-online-update',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb
  ) as request_id;
  $$
);
```

### 2. Analyst Auto-Tune (Nightly 01:40 UTC)
```sql
select cron.schedule(
  'analyst-auto-tune',
  '40 1 * * *', -- 01:40 UTC daily
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/analyst-auto-tune',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Learning Hub Sync (Hourly)
```sql
select cron.schedule(
  'learning-hub-sync',
  '0 * * * *', -- Every hour
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/learning-hub-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb
  ) as request_id;
  $$
);
```

## Testing & Verification

### 1. Learning Hub Sync
```javascript
const { data } = await supabase.functions.invoke('learning-hub-sync');
console.log('Queued jobs:', data.queued);
```

### 2. Oracle Online Update
```javascript
const { data } = await supabase.functions.invoke('oracle-online-update');
console.log('Updated signals:', data.updated);
```

### 3. Analyst Auto-Tune
```javascript
const { data } = await supabase.functions.invoke('analyst-auto-tune');
console.log('Tuned params:', data.params);
```

### 4. Analyst v2 with Tuned Params
```javascript
const { data } = await supabase.functions.invoke('analyst-core-v2', {
  body: {
    user_id: user.id,
    tf: '1H',
    candidates: ['META', 'QQQ'],
    flags: { paper_only: true }
  }
});
console.log('Plan:', data.plan);
console.log('Confidence:', data.plan.confidence);
```

### 5. Backtest
```javascript
const { data } = await supabase.functions.invoke('backtest-run', {
  body: {
    symbol: 'SPY',
    tf: '1H',
    fromISO: '2024-09-01T00:00:00Z',
    toISO: '2024-09-15T23:59:59Z'
  }
});
console.log('Results:', data.result);
```

## UI Components

### BacktestPanel (`/analyst` - Backtest tab)
- Symbol, timeframe, date range inputs
- "Run Backtest" button
- Results display (trades, win rate, PnL, avg R:R)

### SystemHealthPanel (`/analyst` - System Health tab)
- Learning Jobs list (job type, status, timestamp)
- System Events feed (source, timestamp, payload preview)
- Auto-refreshes every 30 seconds

## Security Notes

- All tables use workspace-scoped RLS (member-only access)
- Edge functions respect JWT auth where required (backtest-run)
- Cron functions are unauthenticated but workspace-isolated
- Validator enforces risk caps and paper/live mode restrictions
- Idempotency keys prevent duplicate order submissions

## Feature Flags

Add to `agent_feature_flags.flags` for workspace-level control:

```json
{
  "learning_enabled": true,
  "oracle_online_update": true,
  "analyst_auto_tune": true,
  "paper_only": true,
  "max_live_risk_pct": 0.01
}
```

## Future Enhancements (Phase IV+)

- [ ] Multi-symbol plan generator
- [ ] Personality bias weighting (mythic/strategist/mentor modes)
- [ ] Real ML integration via ONNX Runtime
- [ ] Pattern templates library in `bid_patterns`
- [ ] Real-time WebSocket feeds for signals
- [ ] Advanced backtesting with slippage/commissions
- [ ] Performance attribution analysis

## Troubleshooting

### "workspace_id is null"
Ensure `ensure_default_workspace()` RPC is called at function start.

### "RLS policy violation"
Verify user is member of workspace via `workspace_members` table.

### No learning jobs queued
Check that `bid_learning_events` and `repository_events` have recent activity.

### Tuning not working
Ensure `bid_user_stats` has sufficient data (>= 5 symbols with trades).

## Links

- Edge Functions: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/functions
- Cron Jobs: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/database/cron-jobs
- Tables: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/editor
