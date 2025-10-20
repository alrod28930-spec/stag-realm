# Subscription System Bypass Guide

## Overview

The subscription/tier enforcement system is **disabled by default**. All users are treated as **Elite tier** with full feature access. This allows development and testing without billing infrastructure.

## Architecture

### Two-Layer Control System

1. **Backend (Edge Functions)**: Controlled by `SUBSCRIPTION_ENFORCEMENT` environment variable
2. **Frontend (React)**: Controlled by `VITE_SUBSCRIPTION_ENFORCEMENT` environment variable
3. **Database**: Uses `app.subscription_enforcement` setting (defaults to false)

**Default State**: All three layers default to `false` (disabled) - full Elite access granted.

---

## How the Bypass Works

### Backend (Edge Functions)

```typescript
// supabase/functions/_shared/subscription.ts
export const ENFORCE_SUBS = 
  (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") ?? "false").toLowerCase() === "true";

// In any edge function:
import { ENFORCE_SUBS } from "../_shared/subscription.ts"

if (!ENFORCE_SUBS) {
  console.log('🔓 Feature unlocked (enforcement disabled)');
  // Grant access
} else {
  // Check tier and restrict if needed
}
```

**Files Updated**:
- `supabase/functions/bot-engine/index.ts` - Bot creation bypass
- `supabase/functions/analyst-oracle/index.ts` - Oracle access bypass

### Frontend (React Components)

```typescript
import { isSubscriptionEnforcementEnabled } from '@/utils/subscriptionGate';

const enforcementEnabled = isSubscriptionEnforcementEnabled();

if (!enforcementEnabled) {
  // Show all features
} else {
  // Check tier and show locks
}
```

**Files Updated**:
- `src/components/tradeBots/TradeBotManager.tsx` - Hide tier gate
- `src/components/tradebots/BotLibrary.tsx` - Show all templates
- `src/services/analystV2.ts` - Ignore locked feature responses

### Database Functions

```sql
-- Helper function
CREATE FUNCTION is_subscription_enforcement_enabled()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.subscription_enforcement', true)::boolean,
    false  -- Default: disabled
  );
END;

-- Updated functions
CREATE FUNCTION has_entitlement(p_workspace uuid, p_feature text)
RETURNS boolean AS $$
BEGIN
  -- Bypass when disabled
  IF NOT is_subscription_enforcement_enabled() THEN
    RETURN true;
  END IF;
  
  -- Normal check
  RETURN (SELECT enabled FROM workspace_entitlements...);
END;
```

**Functions Updated**:
- `has_entitlement()` - Always returns true when disabled
- `get_user_subscription_tier()` - Returns 'elite' when disabled
- `has_tab_access()` - Always returns true when disabled

---

## UI Cleanup (Phase 3)

### Hidden Elements
- Upgrade prompts ("Upgrade to Pro")
- Subscription tier badges
- Pricing/billing UI elements

### Disabled Services
- `billing-webhook` - Returns early with disabled message
- Subscription-related edge functions can be ignored

**Files Modified**:
- `supabase/functions/billing-webhook/index.ts` - Commented out, returns early
- `src/components/compliance/ComplianceStatus.tsx` - Hid tier badge
- `src/components/tradeBots/TradeBotManager.tsx` - Hid upgrade button
- `src/components/tradebots/BotLibrary.tsx` - Changed upgrade text

---

## Re-enabling Subscriptions (Future)

When you're ready to enable billing:

### 1. Set Environment Variables

**Backend** (Supabase Dashboard → Edge Functions → Environment Variables):
```bash
SUBSCRIPTION_ENFORCEMENT=true
```

**Frontend** (.env file):
```bash
VITE_SUBSCRIPTION_ENFORCEMENT=true
```

**Database** (Run SQL):
```sql
ALTER DATABASE postgres SET app.subscription_enforcement = true;
```

### 2. Configure Stripe

Add Stripe keys to environment:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LITE=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ELITE=price_...
```

### 3. Uncomment Billing Webhook

In `supabase/functions/billing-webhook/index.ts`:
- Uncomment the Stripe import
- Remove the early return
- Uncomment the main webhook logic

### 4. Unhide UI Elements

Search for comments containing:
- `"Subscription tier hidden"`
- `"Upgrade prompt hidden"`
- `"while subscription enforcement is disabled"`

Uncomment these sections to restore tier-based UI.

---

## Testing the System

### With Enforcement Disabled (Current State)

```bash
# Backend - No env var needed (defaults to false)
# Frontend - No env var needed (defaults to false)
# Database - Already defaults to false

# Expected behavior:
✅ All features accessible
✅ No tier checks
✅ No "locked" messages
✅ All bots deployable
✅ Full Oracle access
```

### With Enforcement Enabled (Future)

```bash
# Set all three flags to true
SUBSCRIPTION_ENFORCEMENT=true  # Backend
VITE_SUBSCRIPTION_ENFORCEMENT=true  # Frontend
# Database: ALTER DATABASE postgres SET app.subscription_enforcement = true;

# Expected behavior:
❌ Features locked by tier
❌ Tier checks active
❌ "Upgrade" prompts shown
❌ Bot limits enforced
❌ Oracle limits enforced
```

---

## Key Files Reference

### Core Bypass Logic
- `src/utils/subscriptionGate.ts` - Frontend enforcement check
- `src/utils/featureFlags.ts` - Feature flag system (includes subscription_enforcement)
- `supabase/functions/_shared/subscription.ts` - Backend enforcement flag

### Database Functions
- `is_subscription_enforcement_enabled()` - Check DB enforcement setting
- `has_entitlement()` - Feature entitlement checker (bypassed)
- `get_user_subscription_tier()` - Tier lookup (returns 'elite' when bypassed)
- `has_tab_access()` - Tab access checker (bypassed)

### Modified Components
- Bot management components (TradeBotManager, BotLibrary)
- Analyst service (analystV2.ts)
- Compliance UI (ComplianceStatus.tsx)

### Disabled Services
- `billing-webhook` - Stripe webhook handler (commented out)

---

## Migration Status

- ✅ Phase 1: Backend + Frontend bypass implemented
- ✅ Phase 2: Database functions updated with bypass logic
- ✅ Phase 3: UI cleanup (hidden upgrade prompts, disabled billing webhook)

**Current State**: Fully bypassed - All users have Elite tier access by default.
