# Phase V Deployment Guide
## RL Policy Improvement + Ensemble Oracle + Shadow A/B

This document outlines the deployment and operation of Phase V features.

---

## 1. Prerequisites

- ✅ Phase II (Analyst Core v2) deployed
- ✅ Phase III (Safety utilities) deployed  
- ✅ Phase IV (Execution guards) deployed
- ✅ Alpaca credentials configured (for live execution)
- ✅ Database migration XXXX_phase5_rl.sql applied

---

## 2. Database Schema

### New Tables

1. **rl_policies** - Trading strategy parameter sets
   - `id`, `workspace_id`, `name`, `params`, `status`, `created_at`, `updated_at`
   - Status: `candidate | shadow | active | archived`

2. **rl_policy_results** - Performance metrics per policy
   - `id`, `workspace_id`, `policy_id`, `time_window`, `trades`, `win_rate`, `pnl_bp`, `avg_rr`, `sharpe`

3. **oracle_models** - Ensemble signal model components
   - `id`, `workspace_id`, `name`, `weight`, `enabled`, `params`
   - Default models: EMA, RSI, Volume, Breakout

4. **ab_experiments** - Shadow test experiment registry
   - `id`, `workspace_id`, `name`, `a_policy_id` (baseline), `b_policy_id` (candidate), `status`, `started_at`, `stopped_at`

All tables have RLS policies scoped to workspace membership.

---

## 3. Edge Functions

### oracle-ensemble
**Purpose:** Combines multiple signal models into weighted ensemble score  
**Schedule:** Every 10 minutes during market hours  
**Input:** `{ symbols: ['SPY', 'QQQ'], tf: '1H' }`  
**Output:** Inserts `oracle_signals` with `signal_type='ensemble'`

**Logic:**
- Fetches enabled `oracle_models` for workspace
- For each symbol, computes individual scores (EMA, RSI, Volume, Breakout)
- Weighted average: `Σ (w_i * s_i)`, normalized to [0,1]
- EWMA smoothing (α=0.3) to reduce jitter
- Direction: `1` (bullish) if score > 0.6, `-1` (bearish) if < 0.4, else `0` (neutral)

**Test:**
```js
await supabase.functions.invoke('oracle-ensemble', {
  body: { symbols: ['SPY', 'QQQ', 'META'], tf: '1H' }
})
```

---

### policy-runner
**Purpose:** Executes policies in `shadow` or `active` mode  
**Schedule:** Every 30 minutes (market hours) for active experiments  
**Input:** `{ symbols, tf, policy_id, mode: 'shadow'|'active' }`  

**Logic:**
- **Shadow mode:**
  - Generates plan via `analyst-core-v2` with `policy_params` override
  - Simulates virtual fill (no broker API call)
  - Logs to `repository_events` (source=`shadow_fill`) and `bid_learning_events` (payload.shadow=true)
- **Active mode:**
  - Validates via `validator()` and checks `circuitBreaker`, `positionLimitCheck`
  - Would execute real order (broker integration pending)

**Test:**
```js
await supabase.functions.invoke('policy-runner', {
  body: {
    symbols: ['SPY', 'QQQ'],
    tf: '1H',
    policy_id: '<candidate-id>',
    mode: 'shadow'
  }
})
```

---

### offline-sim
**Purpose:** Deterministic backtester for policy evaluation  
**Schedule:** On demand (UI or nightly batch)  
**Input:** `{ symbol, tf, fromISO, toISO, policy_id }`  
**Output:** `{ trades, win_rate, pnl_bp, avg_rr, sharpe }`

**Logic:**
- Fetches candles via `fetch_candles`
- Applies policy params (stop_loss, take_profit, risk_pct, slippage_bps)
- Simple strategy: Long when close > EMA20, exit on stop/target
- Fixed slippage: 2 bps (configurable)
- Sharpe calculated as: `(avg_return / std_dev) * sqrt(252)`

**Test:**
```js
await supabase.functions.invoke('offline-sim', {
  body: {
    symbol: 'SPY',
    tf: '1H',
    fromISO: '2024-09-01T00:00:00Z',
    toISO: '2024-09-15T00:00:00Z',
    policy_id: '<candidate-id>'
  }
})
```

---

### rl-policy-improve
**Purpose:** Bandit-style parameter tuning based on recent performance  
**Schedule:** Nightly (1 AM UTC)  
**Input:** None (auto-detects policies)  
**Output:** Creates new `candidate` policies with improved params

**Logic:**
- For each `active` or `shadow` policy:
  - Fetch last 10 `rl_policy_results`
  - Compute objective: `0.5 * win_rate + 0.5 * sharpe_normalized`
  - If objective > 0.6: increase `risk_pct` by 0.002 (cap at 0.03)
  - If objective < 0.4: decrease `risk_pct` by 0.002 (floor at 0.01)
  - If win_rate < 0.4: widen `stop_loss` by 0.005 (cap at 0.05)
  - If win_rate > 0.6: tighten `stop_loss` by 0.005 (floor at 0.01)
  - Adjust `take_profit` to maintain R:R = 2.0
- Calls `offline-sim` to backtest new candidate
- Inserts new `rl_policies` row with status=`candidate`

**Test:**
```js
await supabase.functions.invoke('rl-policy-improve', { body: {} })
```

---

### ab-evaluate
**Purpose:** Compare baseline vs candidate, recommend promotion  
**Schedule:** Every 12 hours (for running experiments)  
**Input:** `{ experiment_id }`  
**Output:** `{ ok, recommend, reason, scoreA, scoreB, metricsA, metricsB }`

**Logic:**
- Fetches `ab_experiments` row
- Loads last 50 `rl_policy_results` for both A (baseline) and B (candidate)
- Checks: `B trades >= min_shadow_samples` (default: 50)
- Computes combined score: `0.3*WR + 0.3*RR + 0.2*Sharpe + 0.2*(1-downside)`
- Recommends promotion if: `scoreB >= promote_threshold (0.58)` AND `scoreB > scoreA`
- If `AUTO_PROMOTE=true` (default: false), automatically promotes B and archives A

**Test:**
```js
await supabase.functions.invoke('ab-evaluate', {
  body: { experiment_id: '<experiment-id>' }
})
```

---

## 4. Feature Flags

Update `feature_flags.flags` for each workspace:

```json
{
  "rl_enabled": true,
  "shadow_mode": true,
  "ensemble_oracle": true,
  "backtest_gate_enabled": true,
  "min_shadow_samples": 50,
  "promote_threshold": 0.58
}
```

---

## 5. Scheduler Configuration

Add these cron jobs (or equivalent scheduled function invocations):

| Function | Frequency | Window | Notes |
|----------|-----------|--------|-------|
| `oracle-ensemble` | 10 min | Market hours | 9:30 AM - 4:00 PM ET |
| `policy-runner` (shadow) | 30 min | Market hours | For running experiments only |
| `rl-policy-improve` | Nightly | 1 AM UTC | Creates candidate policies |
| `ab-evaluate` | 12 hours | 6 AM, 6 PM UTC | Evaluates running experiments |

**Example: Supabase pg_cron**

```sql
-- Oracle ensemble every 10 min (market hours only, manual gate in app)
select cron.schedule(
  'oracle-ensemble-10m',
  '*/10 9-16 * * 1-5',  -- Mon-Fri, 9 AM - 4 PM
  $$
  select net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-ensemble',
    headers:='{"Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{"symbols":["SPY","QQQ"],"tf":"1H"}'::jsonb
  );
  $$
);

-- RL policy improve nightly
select cron.schedule(
  'rl-improve-nightly',
  '0 1 * * *',  -- 1 AM UTC
  $$
  select net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/rl-policy-improve',
    headers:='{"Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

## 6. UI Integration

### Analyst Page → Policies Tab
**Component:** `<PoliciesPanel />`  
**Features:**
- List all policies (Active, Shadow, Candidate, Archived)
- View/edit policy params (JSON editor)
- Set status: `candidate → shadow`, `shadow → candidate`, `* → archived`
- Button: "Shadow Test for 7 days" → creates `ab_experiments` row

### Analyst Page → Experiments Tab
**Component:** `<ExperimentsPanel />`  
**Features:**
- Shows live A/B metrics (sparkline WR, PnL bp, Sharpe)
- Button: "Evaluate & Recommend" → calls `ab-evaluate`
- If recommended: "Promote" button (manual gate)
- Displays baseline vs candidate side-by-side

### Analyst Page → Oracle Models Tab
**Component:** `<OracleModelsPanel />`  
**Features:**
- Toggle individual ensemble members (EMA, RSI, Volume, Breakout)
- Adjust weights via slider (0-100%)
- "Normalize" button to equalize enabled model weights
- "Run Now" button → invokes `oracle-ensemble`

---

## 7. Promotion Workflow

1. **Create Candidate:**  
   - `rl-policy-improve` generates new candidate nightly
   - User manually creates policy via UI (future)

2. **Start Shadow Test:**  
   - User clicks "Shadow Test" on candidate policy
   - Sets policy status to `shadow`
   - Creates `ab_experiments` row with baseline (active) vs candidate

3. **Monitor:**  
   - `policy-runner` runs every 30 min (shadow mode)
   - Logs virtual fills to `bid_learning_events`
   - `ab-evaluate` runs every 12 hours

4. **Evaluate:**  
   - User clicks "Evaluate & Recommend"
   - Shows scoreA vs scoreB, metrics comparison
   - If `scoreB >= 0.58` and `scoreB > scoreA` and `trades >= 50`: recommends promotion

5. **Promote:**  
   - User clicks "Promote" (manual gate, unless `AUTO_PROMOTE=true`)
   - Sets experiment status to `promoted`
   - Sets candidate policy to `active`
   - Archives baseline policy

---

## 8. Safety & Determinism

- **All live execution** still goes through Phase IV guards:
  - `validator()` (risk checks, stops required)
  - `circuitBreaker()` (drawdown limits)
  - `positionLimitCheck()` (portfolio risk caps)
  - Idempotency via `_shared/safety.ts`

- **Shadow mode never touches broker API**  
  - No Alpaca calls
  - Virtual fills only
  - Safe to run in parallel

- **Backtest assumptions:**  
  - Fixed slippage: 2 bps (configurable)
  - No randomness (EMA, RSI deterministic)
  - Sharpe uses 252 trading days

---

## 9. Verification Logs

### Initial Setup
```bash
# 1. Verify tables
select count(*) from rl_policies;
select count(*) from oracle_models;  # Should have 4 default models
select count(*) from ab_experiments;

# 2. Run oracle-ensemble
supabase functions invoke oracle-ensemble --body '{"symbols":["SPY","QQQ"],"tf":"1H"}'
# Expected: oracle_signals inserted with signal_type='ensemble'

# 3. Create candidate policy (via UI or manually)
# 4. Start shadow test (via UI)
# 5. Check shadow fills
select * from repository_events where source='shadow_fill' order by ts desc limit 5;

# 6. Run offline-sim
supabase functions invoke offline-sim --body '{"symbol":"SPY","tf":"1H","fromISO":"2024-09-01T00:00:00Z","toISO":"2024-09-15T00:00:00Z","policy_id":"<id>"}'
# Expected: rl_policy_results row inserted

# 7. Run rl-policy-improve
supabase functions invoke rl-policy-improve
# Expected: new candidate policy created

# 8. Evaluate experiment
supabase functions invoke ab-evaluate --body '{"experiment_id":"<id>"}'
# Expected: { recommend: true|false, scoreA, scoreB }
```

---

## 10. Troubleshooting

### No Oracle Signals Generated
- Check: `oracle_models` table has enabled models
- Run: `oracle-ensemble` manually
- Verify: candles exist in `candles` table for symbols

### Shadow Fills Not Logging
- Check: `policy-runner` mode is `'shadow'`
- Verify: `ab_experiments` status is `'running'`
- Inspect: `repository_events` for source=`shadow_fill`

### Backtest Returns Zero Trades
- Check: candles date range covers at least 20 periods
- Verify: policy params are reasonable (SL/TP not too tight)
- Inspect: `fetch_candles` RPC returns data

### Promotion Not Recommended
- Check: `min_shadow_samples` reached (default: 50)
- Verify: scoreB > scoreA and scoreB >= promote_threshold (0.58)
- Inspect: `rl_policy_results` for both A and B

---

## 11. Next Steps

- [ ] Integrate real broker execution in `policy-runner` (active mode)
- [ ] Add UI controls for policy creation (not just RL-generated)
- [ ] Implement multi-symbol portfolio optimization
- [ ] Add model retraining hooks (update EMA/RSI periods based on regime)
- [ ] Create dashboard for live policy comparison charts

---

**End of Phase V Deployment Guide**
