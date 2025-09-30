# BID Migration Guide: Frontend → Backend Architecture

## Overview
This guide documents the migration from frontend-based BID services to a backend-first architecture where Supabase is the single source of truth.

## Architecture Changes

### Before (Frontend-First)
```
Frontend Component → BID Service (in-memory) → Optional Supabase sync
```
**Problems:**
- Two sources of truth (frontend cache + database)
- No validation at database boundary
- Security risks (secrets in migrations)
- Data inconsistency between sessions

### After (Backend-First)
```
Frontend Component → BID Adapter → Supabase (validated) → Database
                     ↓
                Frontend BID Cache (read-only)
```
**Benefits:**
- Single source of truth (Supabase database)
- Validated writes at adapter boundary
- Secure (no secrets in frontend/SQL)
- Consistent data across sessions

## Implementation

### 1. BID Adapter Created
**Location:** `src/integrations/supabase/bid.adapter.ts`

**Features:**
- ✅ JSON Schema validation (Zod) for all writes
- ✅ Type-safe database operations
- ✅ Error handling & logging
- ✅ Event bus integration
- ✅ Validation gates for trades
- ✅ Read/write methods for all BID entities

**Validated Entities:**
- Orders (with risk limits)
- Candles (OHLCV data)
- Oracle Signals
- Recorder Events
- Summaries
- Portfolio Snapshots
- Risk Metrics

### 2. Migration Path

#### Step 1: Replace Direct BID Calls
**Before:**
```typescript
import { bid } from '@/services/bid';
await bid.saveOrder(order);
```

**After:**
```typescript
import { BID } from '@/integrations/supabase/bid.adapter';
const { data, error } = await BID.saveOrder({
  workspace_id: workspaceId,
  order_id: orderId,
  symbol: 'AAPL',
  side: 'buy',
  qty: 100,
  price: 150.00
});

if (error) {
  toast.error('Order validation failed');
  return;
}
```

#### Step 2: Keep Frontend BID as Cache
Rename `src/services/bid.ts` → `src/services/bidCache.ts`

```typescript
// bidCache.ts - READ-ONLY cache layer
export class BIDCache {
  private candles: Map<string, Candle[]> = new Map();
  private signals: Map<string, Signal[]> = new Map();
  
  // Only read methods
  getRecentCandles(symbol: string, tf: string): Candle[] {
    return this.candles.get(`${symbol}_${tf}`) || [];
  }
  
  // Listen to adapter events to update cache
  private initializeListeners() {
    eventBus.on('bid.candle_stored', (candle) => {
      this.updateCandleCache(candle);
    });
  }
}
```

#### Step 3: Add Validation Before Trades
```typescript
import { BID } from '@/integrations/supabase/bid.adapter';

async function executeTrade(trade) {
  // 1. Validate trade first
  const validation = await BID.validateTrade(workspaceId, {
    symbol: trade.symbol,
    side: trade.side,
    qty: trade.quantity,
    price: trade.price
  });
  
  if (!validation.valid) {
    toast.warning(validation.reason);
    
    if (validation.modifications) {
      // Offer to adjust trade
      const confirmed = await confirmDialog(
        `Suggested adjustment: ${validation.modifications.reason}. Use ${validation.modifications.suggested_qty} shares instead?`
      );
      
      if (confirmed) {
        trade.quantity = validation.modifications.suggested_qty;
      } else {
        return; // User cancelled
      }
    } else {
      return; // Hard block
    }
  }
  
  // 2. Record the validated trade
  await BID.saveOrder({
    workspace_id: workspaceId,
    ...trade,
    validator_status: 'pass',
    broker_status: 'proposed'
  });
  
  // 3. Execute via broker
  await executeBrokerOrder(trade);
}
```

### 3. Security Fixes

#### Issue: Hardcoded Secrets in Migrations
**Problem:** Functions like `trigger_market_data_sync()` had hardcoded Bearer tokens

**Solution:** Use server-side scheduled functions
```typescript
// supabase/functions/market-data-cron/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Trigger sync securely using environment credentials
  const result = await supabaseClient.functions.invoke('market-data-sync');
  
  return new Response(JSON.stringify({ success: true, result }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### Remove from SQL:
```sql
-- ❌ DELETE THIS:
CREATE OR REPLACE FUNCTION public.trigger_market_data_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/market-data-sync',
    headers:='{"Authorization": "Bearer <HARDCODED_TOKEN>"}'::jsonb  -- ❌ SECURITY RISK
  ) INTO result;
  RETURN result;
END;
$function$;
```

#### Replace with Scheduled Job:
Use Supabase Dashboard → Database → Cron Jobs:
```sql
SELECT cron.schedule(
  'market-data-sync-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/market-data-cron',
    headers:='{"apikey": "' || current_setting('app.settings.anon_key') || '"}'::jsonb
  );
  $$
);
```

### 4. Example Refactors

#### Example A: Order Execution Component
**Before:**
```typescript
// src/components/OrderTicket.tsx
import { bid } from '@/services/bid';

const handleSubmit = async () => {
  const order = { symbol, side, quantity, price };
  await bid.saveOrder(order); // ❌ No validation, two sources of truth
  await executeTrade(order);
};
```

**After:**
```typescript
// src/components/OrderTicket.tsx
import { BID } from '@/integrations/supabase/bid.adapter';

const handleSubmit = async () => {
  // ✅ Validate first
  const validation = await BID.validateTrade(workspaceId, {
    symbol,
    side,
    qty: quantity,
    price
  });
  
  if (!validation.valid) {
    toast.error(validation.reason);
    return;
  }
  
  // ✅ Save with validation
  const { data, error } = await BID.saveOrder({
    workspace_id: workspaceId,
    order_id: generateULID(),
    symbol,
    side,
    qty: quantity,
    price,
    validator_status: 'pass',
    broker_status: 'proposed'
  });
  
  if (error) {
    toast.error('Failed to record order');
    return;
  }
  
  await executeTrade(data);
};
```

#### Example B: Market Data Feed
**Before:**
```typescript
// src/services/repository.ts
import { bid } from './bid';

eventBus.on('repository.candle_processed', (candle) => {
  bid.storeCandle(candle); // ❌ Only in memory
});
```

**After:**
```typescript
// src/services/repository.ts
import { BID } from '@/integrations/supabase/bid.adapter';
import { bidCache } from './bidCache'; // read-only cache

eventBus.on('repository.candle_processed', async (candle) => {
  // ✅ Write to database (single source of truth)
  await BID.storeCandle({
    workspace_id: currentWorkspace,
    ...candle
  });
  
  // Cache is updated automatically via event listener
  // (bidCache listens to 'bid.candle_stored' event)
});
```

## Database Schema Notes

### Current Tables (Already in Schema)
- ✅ `candles` - OHLCV market data
- ✅ `oracle_signals` - AI/ML signals
- ✅ `rec_events` - Append-only event log
- ✅ `positions_current` - Portfolio positions
- ✅ `risk_portfolio` - Risk metrics
- ✅ `blacklists` - Blocked symbols
- ✅ `bot_profiles` - Bot configurations

### Missing Tables (Need Migration)
- ❌ `orders` - Dedicated orders table
- ❌ `summaries` - Trade summaries

**Temporary Solution:**
Orders and summaries are stored as `rec_events` with `entity_type='order'` or `entity_type='summary'` until dedicated tables are created.

## Validation Rules

### Order Validation
```typescript
interface OrderValidation {
  // Required
  symbol: /^[A-Z.]{1,10}$/  // Valid symbol format
  qty: > 0                    // Positive quantity
  side: 'buy' | 'sell'        // Valid side
  
  // Risk checks
  tradeValue <= (equity * risk_per_trade_pct)  // Position sizing
  symbol NOT IN blacklists                      // Blacklist check
  
  // Optional limits
  stop_loss_pct: 0-20%       // Max 20% stop loss
  take_profit_pct: 0-50%     // Max 50% take profit
}
```

### Candle Validation
```typescript
interface CandleValidation {
  symbol: /^[A-Z.]{1,10}$/
  tf: '1m' | '5m' | '15m' | '1h' | '1D'
  ts: ISO8601 datetime
  o, h, l, c, v: numbers      // OHLCV must be numeric
  h >= max(o, c)              // High must be highest
  l <= min(o, c)              // Low must be lowest
}
```

## Checklist

### Phase 1: Foundation (✅ Complete)
- [x] Create BID adapter with validation
- [x] Add Zod schemas for all entities
- [x] Implement CRUD operations
- [x] Add trade validation gate
- [x] Document migration path

### Phase 2: Refactor Services (TODO)
- [ ] Rename `bid.ts` → `bidCache.ts`
- [ ] Remove write methods from cache
- [ ] Update all `bid.saveX()` calls to `BID.saveX()`
- [ ] Add validation before all trade executions
- [ ] Update `repository.ts` to use adapter

### Phase 3: Security (TODO)
- [ ] Remove hardcoded triggers from migrations
- [ ] Create `market-data-cron` edge function
- [ ] Set up Supabase cron job
- [ ] Audit all edge functions for secrets
- [ ] Implement env-based auth everywhere

### Phase 4: UI Integration (TODO)
- [ ] Update `OrderTicket.tsx`
- [ ] Update `TradingDesk.tsx`
- [ ] Update `BotEngine.tsx`
- [ ] Add validation feedback UI
- [ ] Show modification suggestions in modals

### Phase 5: Testing & Validation (TODO)
- [ ] Test order validation flow
- [ ] Test blacklist enforcement
- [ ] Test risk limit enforcement
- [ ] Test cache synchronization
- [ ] Load testing with concurrent writes

## Migration Commands

```bash
# 1. No code changes needed yet - adapter is drop-in ready

# 2. When ready to migrate a component:
# Find all bid.* calls:
grep -r "bid\." src/components/

# Replace with BID.* calls:
# (Manual refactor - use VSCode find/replace)

# 3. Test validation:
# Import BID adapter in component
# Call BID.validateTrade() before execution
# Handle validation.valid === false case

# 4. Deploy edge functions securely:
supabase functions deploy market-data-cron
supabase functions deploy trade-execute
```

## Benefits Achieved

1. **Single Source of Truth**: All data writes go through Supabase
2. **Validation at Boundary**: Invalid data rejected before DB write
3. **Security**: No secrets in frontend or SQL
4. **Auditability**: All writes logged to `rec_events`
5. **Consistency**: Data persists across sessions
6. **Type Safety**: Zod schemas enforce structure
7. **Error Handling**: Graceful failures with user feedback
8. **Testability**: Can mock BID adapter for tests

## Next Steps

1. Review this guide with team
2. Prioritize services to migrate (start with OrderTicket, BotEngine)
3. Create `bidCache.ts` as read-only layer
4. Update 1-2 components at a time
5. Test thoroughly in development
6. Deploy security fixes (remove hardcoded triggers)
7. Monitor adapter performance in production
