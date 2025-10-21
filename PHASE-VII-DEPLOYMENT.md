# Phase VII Deployment Guide: Predictive Anomalies + Sentiment Analysis

## Overview

Phase VII extends Phases II–VI by adding a **predictive awareness layer** that fuses price anomalies, news sentiment, and price momentum into the Oracle + Analyst decision engine. All logic remains deterministic, RLS-safe, and auditable.

---

## What's New

### 1. **Predictive Data Pipeline**

Three new tables store predictive signals:

- **`oracle_news`**: Raw news headlines with sentiment scores (-1 to +1)
- **`oracle_anomalies`**: Detected price/volume anomalies (z-score based)
- **`oracle_predictive`**: Fused predictive scores combining momentum, sentiment, and anomaly severity

### 2. **Three New Edge Functions**

#### `oracle-anomaly-watch`
- Detects volatility and volume spikes using z-score analysis
- Flags anomalies with severity scores (0-1)
- Runs every 5 minutes

#### `oracle-sentiment-scan`
- Fetches news headlines (mock mode by default)
- Scores sentiment using keyword-based lexicon
- Aggregates 24h sentiment into `oracle_signals`
- Runs hourly

#### `oracle-predictive-merge`
- Fuses price momentum (from `oracle_signals`), sentiment, and anomaly data
- Outputs unified predictive score (0-1) to `oracle_predictive`
- Runs every 15 minutes

### 3. **Analyst Risk Adjustment**

The `analyst-core-v2` function now integrates predictive scores:

**Risk Boost** (+0.3% cap):
- When `score ≥ 0.8` AND `sentiment ≥ 0.2` AND `anomaly ≤ 0.2`

**Risk Cut** (-0.5% cap):
- When `anomaly ≥ 0.5` OR `sentiment ≤ -0.3`

All adjustments respect existing `risk_cap` from policies and are clamped to safe limits.

### 4. **UI Dashboard**

New **Predictive** tab in the Analyst page shows:
- Real-time predictive scores per symbol/timeframe
- Sentiment badges (Positive/Neutral/Negative)
- Anomaly warnings (High Vol/Med Vol/Normal)
- Confidence badges (Confident/Moderate/Low)
- Price momentum percentage

---

## Architecture

### Database Schema

```sql
-- News store (extended from Phase III)
oracle_news (
  id, workspace_id, symbol, headline, source, 
  ts, sentiment, confidence, created_at
)

-- Anomaly detection
oracle_anomalies (
  id, workspace_id, symbol, tf, kind, severity,
  observed_at, meta
)

-- Fused predictive scores
oracle_predictive (
  workspace_id, symbol, tf, score, sentiment,
  anomaly, price_momentum, updated_at
)
```

### Feature Flags

Add these to `agent_feature_flags.flags`:

```json
{
  "predictive_enabled": true,
  "anomaly_watch": true,
  "sentiment_enabled": true,
  "predictive_merge": true,
  "size_boost_cap": 0.003,
  "size_cut_cap": 0.005
}
```

---

## Edge Function Details

### `oracle-anomaly-watch`

**Input:**
```json
{
  "symbols": ["SPY", "QQQ", "META"],
  "tf": "1H"
}
```

**Logic:**
1. Fetch 48h of candles via `fetch_candles` RPC
2. Calculate mean, std dev for price and volume
3. Compute z-scores for latest candle
4. Flag anomalies where z > 2σ
5. Insert into `oracle_anomalies`

**Output:**
```json
{
  "ok": true,
  "inserted": 2,
  "anomalies": [...]
}
```

---

### `oracle-sentiment-scan`

**Input:**
```json
{
  "symbols": ["SPY", "META"]
}
```

**Logic:**
1. Fetch headlines (mock mode or external API)
2. Score sentiment using keyword lexicon
3. Insert into `oracle_news`
4. Aggregate 24h sentiment per symbol
5. Write to `oracle_signals` with `signal_type='sentiment'`

**Output:**
```json
{
  "ok": true,
  "inserted": 3
}
```

**Environment Variables (Optional):**
- `NEWS_PROVIDER`: `"mock"` (default) or `"finnhub"`/`"newscatcher"`
- `NEWS_API_KEY`: API key for external provider

---

### `oracle-predictive-merge`

**Input:**
```json
{
  "symbols": ["SPY", "QQQ"],
  "tf": "1H"
}
```

**Logic:**
1. Load recent `oracle_signals` (ensemble type) for price momentum
2. Calculate EWMA over 20 recent signals
3. Aggregate 24h sentiment from `oracle_news`
4. Fetch latest anomaly severity (6h window)
5. Fuse into score: `0.6*momentum + 0.3*((sentiment+1)/2) - 0.5*anomaly`
6. Upsert into `oracle_predictive`
7. Log event to `repository_events`

**Output:**
```json
{
  "ok": true,
  "updated": 2,
  "data": [...]
}
```

---

## Analyst Integration

### Updated Logic in `analyst-core-v2`

```typescript
// Load predictive scores
const { data: predData } = await supabase
  .from("oracle_predictive")
  .select("*")
  .eq("workspace_id", workspace_id)
  .in("symbol", candidates)
  .eq("tf", tf);

// Apply risk adjustment
if (flags.predictive_enabled && predictive) {
  // Boost
  if (score >= 0.8 && sentiment >= 0.2 && anomaly <= 0.2) {
    risk_pct += size_boost_cap; // +0.3% max
  }
  
  // Cut
  if (anomaly >= 0.5 || sentiment <= -0.3) {
    risk_pct -= size_cut_cap; // -0.5% max
  }
}

// Clamp to risk_cap from policy
risk_pct = Math.min(risk_pct, params.risk_cap);
```

---

## Scheduler Setup

Add these cron jobs to Supabase:

```sql
-- Anomaly watch (every 5 min)
SELECT cron.schedule(
  'oracle-anomaly-watch-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-anomaly-watch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{"symbols":["SPY","QQQ","META"],"tf":"1H"}'::jsonb
  );
  $$
);

-- Sentiment scan (hourly)
SELECT cron.schedule(
  'oracle-sentiment-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-sentiment-scan',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{"symbols":["SPY","QQQ","META"]}'::jsonb
  );
  $$
);

-- Predictive merge (every 15 min)
SELECT cron.schedule(
  'oracle-predictive-merge-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/oracle-predictive-merge',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{"symbols":["SPY","QQQ","META"],"tf":"1H"}'::jsonb
  );
  $$
);
```

---

## Verification Steps

### 1. **Anomaly Detection**

```bash
supabase functions invoke oracle-anomaly-watch \
  --body '{"symbols":["SPY","QQQ"],"tf":"1H"}'
```

**Expected:**
```json
{
  "ok": true,
  "inserted": 1,
  "anomalies": [{
    "symbol": "SPY",
    "kind": "zscore",
    "severity": 0.642,
    "meta": {"z": "2.87", "zv": "1.45"}
  }]
}
```

**Verify in DB:**
```sql
SELECT * FROM oracle_anomalies 
WHERE workspace_id = '<your-ws-id>' 
ORDER BY observed_at DESC LIMIT 5;
```

---

### 2. **Sentiment Scan**

```bash
supabase functions invoke oracle-sentiment-scan \
  --body '{"symbols":["SPY","META"]}'
```

**Expected:**
```json
{
  "ok": true,
  "inserted": 2
}
```

**Verify in DB:**
```sql
SELECT symbol, headline, sentiment 
FROM oracle_news 
WHERE workspace_id = '<your-ws-id>' 
ORDER BY ts DESC LIMIT 5;

SELECT symbol, value 
FROM oracle_signals 
WHERE workspace_id = '<your-ws-id>' 
  AND signal_type = 'sentiment'
ORDER BY ts DESC;
```

---

### 3. **Predictive Merge**

```bash
supabase functions invoke oracle-predictive-merge \
  --body '{"symbols":["SPY","QQQ"],"tf":"1H"}'
```

**Expected:**
```json
{
  "ok": true,
  "updated": 2,
  "data": [{
    "symbol": "SPY",
    "score": 0.742,
    "sentiment": 0.167,
    "anomaly": 0.321,
    "price_momentum": 0.678
  }]
}
```

**Verify in DB:**
```sql
SELECT * FROM oracle_predictive 
WHERE workspace_id = '<your-ws-id>' 
ORDER BY score DESC;
```

---

### 4. **Analyst Risk Adjustment**

```bash
supabase functions invoke analyst-core-v2 \
  --body '{"symbols":["SPY"],"tf":"1H","capital":100000}'
```

**Check logs for:**
```
[analyst-core-v2] predictive=true
[analyst-core-v2] Loaded 1 predictive scores
[risk] Predictive boost: +0.003 (score=0.82, sent=0.25)
```

**Verify plan includes adjusted `risk_pct`.**

---

### 5. **UI Dashboard**

1. Navigate to **Analyst** page
2. Click **Predictive** tab
3. Verify table shows:
   - Symbol, TF, Confidence badge
   - Score (green if ≥70%)
   - Sentiment badge (Positive/Neutral/Negative)
   - Anomaly badge (⚠ High Vol if ≥50%)
   - Momentum percentage

**Badges:**
- **Confident**: score ≥ 0.8 (🔼 icon)
- **High Vol**: anomaly ≥ 0.5 (⚠ icon)
- **Positive**: sentiment ≥ 0.3

---

## Security & RLS

All new tables enforce workspace RLS:

```sql
CREATE POLICY oracle_anomalies_ws ON oracle_anomalies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = oracle_anomalies.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );
```

**Audit Trail:**
- All predictive merges logged to `repository_events` with `source='predictive'`
- Edge function logs available in Supabase dashboard

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No anomalies detected | Check candles exist for symbol/TF in last 48h |
| Sentiment always 0 | Verify headlines exist in `oracle_news`; check mock mode |
| Predictive scores not updating | Ensure `oracle-ensemble` ran first to populate momentum signals |
| Risk not adjusting | Check `predictive_enabled` flag and verify predictive row exists |
| UI shows "No data" | Run all three edge functions in sequence; check RLS access |

---

## Next Steps (Phase VIII+)

- **Advanced NLP**: Integrate transformer-based sentiment (e.g., FinBERT)
- **Multi-source news**: Add Finnhub, Alpha Vantage, NewsAPI providers
- **Anomaly types**: Add gap detection, volume profile divergence
- **Backtest integration**: Test predictive adjustments against historical data
- **Real-time streaming**: WebSocket feed for instant anomaly alerts

---

## File Changes Summary

### Database
- ✅ `oracle_anomalies` table created
- ✅ `oracle_predictive` table created
- ✅ `oracle_news` extended with `confidence`, `created_at`

### Edge Functions
- ✅ `oracle-anomaly-watch/index.ts`
- ✅ `oracle-sentiment-scan/index.ts`
- ✅ `oracle-predictive-merge/index.ts`
- ✅ `_shared/predictive.ts` (helpers)

### Backend
- ✅ `analyst-core-v2/index.ts` - predictive risk adjustment

### Frontend
- ✅ `src/components/oracle/PredictiveDashboard.tsx`
- ✅ `src/pages/Analyst.tsx` - new Predictive tab

### Docs
- ✅ `PHASE-VII-DEPLOYMENT.md` (this file)

---

## Conclusion

Phase VII completes the predictive feedback loop by:
1. Detecting real-time anomalies
2. Scoring news sentiment
3. Fusing signals into unified scores
4. Dynamically adjusting Analyst risk
5. Visualizing all data in a unified dashboard

The system remains **deterministic**, **auditable**, and **RLS-safe** while adding adaptive intelligence to trading decisions.
