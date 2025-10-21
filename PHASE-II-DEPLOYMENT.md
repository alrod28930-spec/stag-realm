# StagAlgo Phase II: Self-Contained Intelligence Stack

## Overview

Phase II transforms StagAlgo into a self-contained, evolving intelligence platform with three core learning subsystems:

- **Analyst v2**: Deterministic decision engine with state tracking and personality (no LLM dependency)
- **BID v2**: Statistical pattern memory and long-term learning aggregator
- **Oracle v2**: Market signal and forecast engine with real-time indicator calculation

## New Tables

All tables use workspace-scoped RLS policies for security.

### `analyst_states`
Tracks analyst decision state and personality per user/workspace:
- `workspace_id`, `user_id` (composite primary key)
- `mode`: 'paper' | 'live'
- `tone`: 'neutral' | 'mythic' | 'strategist' | 'mentor' | 'street' | 'wall'
- `context`: JSONB state storage
- `last_plan`: JSONB of most recent plan

### `bid_patterns`
Pattern recognition and success tracking:
- `id`: UUID
- `workspace_id`: UUID
- `pattern_hash`: Text signature of pattern
- `feature`: JSONB feature data
- `success_rate`: Numeric (0-1)

### `oracle_signals`
Real-time market signals:
- `workspace_id`, `symbol`, `tf`, `signal_type`
- `value`: Signal value
- `confidence`: Numeric (0-1)
- `ts`: Timestamp

### `repository_events`
Cross-system event bridge and audit log:
- `workspace_id`, `source` ('oracle' | 'bid' | 'analyst' | 'broker')
- `payload`: JSONB event data
- `ts`: Timestamp

## Edge Functions

### `analyst-core-v2` (authenticated)
Deterministic planning engine. No LLM calls.

**Request:**
```json
{
  "user_id": "uuid",
  "tf": "1H",
  "candidates": ["META", "QQQ"],
  "flags": {
    "paper_only": true,
    "allow_live_trades": false
  }
}
```

**Response:**
```json
{
  "ok": true,
  "plan": {
    "plan_version": "v2",
    "mode": "paper",
    "symbol": "META",
    "tf": "1H",
    "side": "buy",
    "entry_logic": "...",
    "size_logic": { "risk_pct": 0.016, "qty_estimate": 10 },
    "stops": { "type": "percent", "stop_loss": 0.014, "take_profit": 0.028 },
    "constraints": { "max_daily_trades": 5, "max_open_positions": 3 },
    "confidence": 0.62,
    "notes": "Self-contained deterministic plan"
  }
}
```

### `bid-learn-aggregate-v2` (unauthenticated - for cron)
Aggregates `bid_learning_events` → `bid_user_stats`. Calculates win rates, avg risk-reward, and hold times.

**Trigger:** Nightly cron (01:30 UTC recommended)

### `oracle-scan-v2` (unauthenticated - for cron)
Generates signals by:
1. Fetching recent candles via `fetch_candles` RPC
2. Calculating EMA, RSI, volume indicators
3. Inserting signals into `oracle_signals`

**Request:**
```json
{
  "symbols": ["META", "QQQ", "SPY"],
  "tf": "1H"
}
```

**Trigger:** Every 10 minutes during market hours, hourly off-hours

### `oracle-score-v2` (unauthenticated)
Updates `oracle_signal_scores` with realized outcomes:

**Request:**
```json
{
  "symbol": "META",
  "tf": "1H",
  "regime": "trend",
  "edge_bp": 12,
  "hit": true
}
```

## Scheduler Configuration

Add to Supabase → Database → Cron Jobs:

### 1. BID Aggregation (Nightly)
```sql
select cron.schedule(
  'bid-aggregate-nightly',
  '30 1 * * *', -- 01:30 UTC daily
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/bid-learn-aggregate-v2',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb
  ) as request_id;
  $$
);
```

### 2. Oracle Signal Scan (Market Hours)
```sql
select cron.schedule(
  'oracle-scan-market-hours',
  '*/10 9-16 * * 1-5', -- Every 10 min, 9am-4pm Mon-Fri (adjust for timezone)
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-scan-v2',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb,
    body := '{"symbols":["META","QQQ","SPY"],"tf":"1H"}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Oracle Signal Scan (Off-Hours)
```sql
select cron.schedule(
  'oracle-scan-off-hours',
  '0 * * * *', -- Hourly
  $$
  select net.http_post(
    url := 'https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-scan-v2',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb,
    body := '{"symbols":["META","QQQ","SPY"],"tf":"1H"}'::jsonb
  ) as request_id;
  $$
);
```

## Testing & Verification

### 1. Workspace Bootstrap
```javascript
const { data, error } = await supabase.rpc('ensure_default_workspace');
console.log('Workspace ID:', data); // Should return UUID
```

### 2. BID Learning Events → Stats
```javascript
// Insert sample events
await supabase.from('bid_learning_events').insert([
  { workspace_id, user_id, symbol: 'META', tf: '1H', event_type: 'order.filled', pnl: 25, payload: {} },
  { workspace_id, user_id, symbol: 'META', tf: '1H', event_type: 'order.filled', pnl: -10, payload: {} },
  { workspace_id, user_id, symbol: 'QQQ', tf: '1H', event_type: 'order.filled', pnl: 30, payload: {} }
]);

// Run aggregation
const { data } = await supabase.functions.invoke('bid-learn-aggregate-v2');
console.log('Aggregated stats:', data.updated, 'rows');

// Verify
const { data: stats } = await supabase.from('bid_user_stats')
  .select('*')
  .eq('workspace_id', workspace_id);
console.log('BID Stats:', stats);
```

### 3. Oracle Signal Scan
```javascript
const { data } = await supabase.functions.invoke('oracle-scan-v2', {
  body: { symbols: ['META', 'QQQ'], tf: '1H' }
});
console.log('Signals generated:', data.inserted);

// Verify
const { data: signals } = await supabase.from('oracle_signals')
  .select('*')
  .eq('workspace_id', workspace_id)
  .order('ts', { ascending: false })
  .limit(10);
console.log('Latest signals:', signals);
```

### 4. Oracle Score Update
```javascript
const { data } = await supabase.functions.invoke('oracle-score-v2', {
  body: {
    symbol: 'META',
    tf: '1H',
    regime: 'trend',
    edge_bp: 12,
    hit: true
  }
});
console.log('Score updated:', data.updated);

// Verify
const { data: scores } = await supabase.from('oracle_signal_scores')
  .select('*')
  .eq('workspace_id', workspace_id)
  .eq('symbol', 'META');
console.log('Oracle scores:', scores);
```

### 5. Analyst v2 Plan Generation
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

// Verify state persistence
const { data: state } = await supabase.from('analyst_states')
  .select('*')
  .eq('workspace_id', workspace_id)
  .eq('user_id', user.id)
  .single();
console.log('Saved state:', state.last_plan);
```

## UI Components

### AnalystV2Panel
Located at `/analyst`, shows:
- Plan generation button
- Symbol, timeframe, side, confidence display
- Risk parameters (size, stops)
- Full plan JSON viewer
- BID/Oracle stats counts

## Security Notes

- All tables use workspace-scoped RLS (member-only access)
- Edge functions respect JWT auth where required
- Cron functions are unauthenticated but workspace-isolated
- Repository events provide audit trail

## Future Enhancements (Phase III+)

- [ ] Add `embeddings` vector column to `bid_patterns` for similarity search
- [ ] Implement `learning-hub-sync` edge function (nightly cross-system digest)
- [ ] Add lightweight ML (linear regression) via ONNX Runtime
- [ ] Create Analyst Persona Trainer UI (tone & bias tuning)
- [ ] Optional LLM adapter plugin (uses Analyst's memory as context)
- [ ] Pattern templates library in `bid_patterns`
- [ ] Real-time WebSocket feeds for Oracle signals

## Troubleshooting

### "workspace_id is null"
Ensure `ensure_default_workspace()` RPC is called at function start.

### "RLS policy violation"
Verify user is member of workspace via `workspace_members` table.

### No signals generated
Check that candles exist in `candles` table for requested symbols/timeframes.

### BID stats not updating
Ensure `bid_learning_events` has sufficient data (>= 1 filled order per symbol/tf).

## Links

- Edge Functions: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/functions
- Cron Jobs: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/database/cron-jobs
- Tables: https://supabase.com/dashboard/project/vtfpwvzufffmtnovvilx/editor
