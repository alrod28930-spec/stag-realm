# Phase VI Deployment Guide: Policy Override Integration

## Overview

Phase VI extends Phase V with full UI integration and policy override capabilities. The Analyst can now accept user-selected policies and apply them dynamically to portfolio generation and signal plans.

---

## What's New

### 1. **UI Integration**
Three new tabs added to the Analyst page:

- **Policies Tab**: Manage RL policies (Active/Shadow/Candidate/Archived)
- **Experiments Tab**: View A/B test results and promote winning policies
- **Oracle Models Tab**: Configure ensemble model weights

### 2. **Policy Override System**
The `analyst-core-v2` function now accepts a `policy_override_id` parameter:

```typescript
{
  "symbols": ["SPY", "QQQ"],
  "tf": "1H",
  "policy_override_id": "uuid-of-policy"  // Optional
}
```

When provided:
- Loads the policy from `rl_policies` (enforces RLS via workspace)
- Applies policy params to risk calculations, stops, and weighting
- Logs the override event to `repository_events`
- Returns the applied policy info in response

---

## Architecture Changes

### New Helper: `supabase/functions/_shared/override.ts`

Exports three functions:

1. **`loadPolicyOverride(supabase, workspace_id, policy_id)`**
   - Fetches policy from DB with RLS enforcement
   - Returns null if not found or unauthorized

2. **`applyPolicyParams(base, override)`**
   - Merges override params into base params
   - Preserves fallback values for missing fields

3. **`logPolicyOverride(supabase, workspace_id, policy_id, params_hash)`**
   - Inserts audit row into `repository_events`
   - Event type: `policy_override`

### Updated: `supabase/functions/analyst-core-v2/index.ts`

**New Input:**
```typescript
policy_override_id?: string  // UUID of policy to apply
```

**New Response Field:**
```typescript
{
  ok: true,
  plan: {...},
  applied_policy: {
    id: "uuid",
    name: "Policy Name",
    status: "shadow" | "active" | "candidate" | "archived"
  },
  metadata: {...}
}
```

**Logic Flow:**
1. Parse `policy_override_id` from request body
2. If provided, load policy via `loadPolicyOverride`
3. Apply params via `applyPolicyParams`
4. Log to `repository_events` via `logPolicyOverride`
5. Include `applied_policy` in response

---

## UI Components

### **PoliciesPanel** (`src/components/analyst/PoliciesPanel.tsx`)
- Lists all policies with status badges
- Edit params (JSON editor)
- Start shadow tests
- Archive old policies

### **ExperimentsPanel** (`src/components/analyst/ExperimentsPanel.tsx`)
- Shows A/B experiments with live metrics
- Compare baseline vs candidate
- Evaluate and promote policies

### **OracleModelsPanel** (`src/components/analyst/OracleModelsPanel.tsx`)
- Toggle ensemble models on/off
- Adjust weights (slider)
- Normalize weights to sum to 1.0
- Run ensemble on demand

---

## Testing Instructions

### 1. **Create a Test Policy**
```sql
INSERT INTO rl_policies (workspace_id, name, params, status)
VALUES (
  '<your-workspace-id>',
  'Test Override Policy',
  '{"risk_base": 0.025, "risk_cap": 0.04, "w_win": 0.6, "w_oracle": 0.4}'::jsonb,
  'candidate'
);
```

### 2. **Invoke with Override**
```bash
supabase functions invoke analyst-core-v2 --body '{
  "symbols": ["SPY"],
  "tf": "1H",
  "policy_override_id": "<policy-uuid>"
}'
```

**Expected Response:**
```json
{
  "ok": true,
  "plan": {...},
  "applied_policy": {
    "id": "<policy-uuid>",
    "name": "Test Override Policy",
    "status": "candidate"
  }
}
```

### 3. **Verify Audit Log**
```sql
SELECT * FROM repository_events
WHERE event_type = 'policy_override'
ORDER BY created_at DESC
LIMIT 5;
```

### 4. **Test UI Tabs**
- Navigate to **Analyst** page
- Switch between **Policies**, **Experiments**, and **Oracle** tabs
- Verify data loads correctly
- Test policy editing and shadow test creation

---

## Security & RLS

All policy operations enforce workspace RLS:
- Users can only read/write policies in their workspace
- `loadPolicyOverride` automatically filters by `workspace_id`
- Policy override attempts for other workspaces fail silently (return null)

**Repository Events:**
- All override usages logged with `event_type='policy_override'`
- Includes `policy_id` and `params_hash` in payload

---

## Deployment Checklist

- [x] Deploy `_shared/override.ts`
- [x] Update `analyst-core-v2` with override logic
- [x] Add new UI tabs to `Analyst.tsx`
- [x] Deploy UI components (`PoliciesPanel`, `ExperimentsPanel`, `OracleModelsPanel`)
- [x] Test policy override flow end-to-end
- [x] Verify RLS enforcement
- [x] Document in `PHASE-VI-DEPLOYMENT.md`

---

## Next Steps (Phase VII+)

- Auto-promote policies based on statistical significance
- Multi-policy ensembles (blend multiple policies)
- Policy versioning and rollback
- Advanced backtest scenarios with slippage/fees
- Real-time policy performance dashboards

---

## Support & Troubleshooting

**Issue:** Policy override not applied
- Check that `policy_override_id` is valid UUID
- Verify policy exists in workspace via: `SELECT * FROM rl_policies WHERE id='<uuid>'`
- Check edge function logs: `supabase functions logs analyst-core-v2`

**Issue:** UI tabs not showing data
- Confirm workspace membership
- Check browser console for errors
- Verify RLS policies are active

**Issue:** Audit log not recording overrides
- Check `repository_events` RLS policies
- Ensure workspace context is set correctly

---

## Conclusion

Phase VI completes the RL policy feedback loop by allowing users to:
1. View and manage policies in UI
2. Override active policy on demand
3. Track all policy usage via audit logs

The system is now fully deterministic, safe, and auditable.
