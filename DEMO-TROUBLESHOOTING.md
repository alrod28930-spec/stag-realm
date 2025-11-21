# Demo Account Troubleshooting

## Quick Checklist

If the demo account isn't showing demo data, check these items in order:

### 1. Login Verification
- [ ] Email: `demo@example.com`
- [ ] Password: `demo123`
- [ ] Check console for: "✅ Demo account logged in successfully"
- [ ] Check console for: "✅ Demo mode activated"

### 2. Console Logs to Check

After logging in as demo user, you should see:
```
✅ Demo user detected: demo@example.com
✅ Demo mode activated - all data is isolated from production
📊 Demo portfolio available: {Object}
📊 Dashboard loading portfolio data
🎭 Demo user detected - loading demo portfolio
Demo portfolio loaded
```

If you don't see these logs, the demo initialization failed.

### 3. User ID Check

Open browser console and run:
```javascript
window.__authStore?.user?.id
// Should return: "00000000-0000-0000-0000-000000000000"

window.__authStore?.user?.email
// Should return: "demo@example.com"
```

### 4. Demo Service Check

In console:
```javascript
// Import the service
import { demoDataService } from '@/services/demoDataService';

// Check if active
demoDataService.isActiveDemo()
// Should return: true

// Check demo data
demoDataService.getPortfolio()
// Should return: {Object with cash, equity, positions...}
```

### 5. Portfolio Store Check

```javascript
// Check real portfolio store
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';

const state = useRealPortfolioStore.getState();
console.log('Portfolio:', state.portfolio);
console.log('Positions:', state.positions);
// Should show demo data if logged in as demo user
```

## Common Issues

### Issue 1: Demo Login Not Working

**Symptoms:**
- Can't log in with demo@example.com
- Gets "Invalid credentials" error

**Solutions:**
1. Make sure you're using exactly: `demo@example.com` and `demo123`
2. Check `src/stores/authStore.ts` line 175 for demo login logic
3. Verify the demo user credentials haven't been changed

### Issue 2: Demo Data Not Loading

**Symptoms:**
- Demo user logs in successfully
- Dashboard shows "No Portfolio Data Found"
- Console shows no demo logs

**Solutions:**
1. Check if `initializeLandingPageDemo()` is being called (should see console log)
2. Verify `demoDataService.activate()` is running
3. Check `useRealPortfolioStore` is checking for demo user in `loadPortfolio()`
4. Look for errors in console related to portfolio loading

### Issue 3: Shows Real Data Instead of Demo

**Symptoms:**
- Demo user logged in but sees real brokerage data
- Or sees other users' data

**Solutions:**
1. Check `isDemoUserId()` function is returning true
2. Verify workspace ID is demo workspace: `00000000-0000-0000-0000-000000000001`
3. Check RLS policies aren't allowing demo user to see real data
4. Clear browser cache and local storage, then re-login

### Issue 4: Demo Data Disappears After Refresh

**Symptoms:**
- Demo data loads initially
- After refresh, data is gone
- Have to log in again

**Expected Behavior:**
This is NORMAL. Demo data is stored in memory only and resets on page reload. This is by design to keep demo isolated.

**Solution:**
Log in again as demo user. For persistent testing, use a real test account instead.

### Issue 5: Demo User Can Place Real Trades

**Symptoms:**
- Demo user can execute trades that hit the database
- Orders appear in Supabase

**Critical Issue - Fix Immediately:**
1. Check `executeTrade()` in portfolioStore has demo user check
2. Verify edge functions reject demo workspace ID writes
3. Review RLS policies on orders/trades tables
4. Add demo user guards to all trading functions

## Debug Steps

### Step 1: Enable Verbose Logging

Add to `src/stores/realPortfolioStore.ts`:
```typescript
loadPortfolio: async () => {
  console.log('🔍 [DEBUG] loadPortfolio called');
  console.log('🔍 [DEBUG] Current user:', useAuthStore.getState().user);
  console.log('🔍 [DEBUG] isDemoUserId:', isDemoUserId(useAuthStore.getState().user?.id));
  
  // ... rest of function
}
```

### Step 2: Check Demo Service State

```javascript
// In browser console
import { demoDataService } from '@/services/demoDataService';

console.log('Active?', demoDataService.isActiveDemo());
console.log('Portfolio:', demoDataService.getPortfolio());
console.log('Signals:', demoDataService.getOracleSignals());
console.log('Trades:', demoDataService.getTradeHistory());
```

### Step 3: Verify Store State

```javascript
// Check auth store
console.log('Auth:', window.__authStore);

// Check portfolio store
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
console.log('Portfolio State:', useRealPortfolioStore.getState());
```

### Step 4: Check Workspace

```javascript
import { useWorkspace } from '@/hooks/useWorkspace';

// In component or console
const { workspaceId, workspace } = useWorkspace();
console.log('Workspace ID:', workspaceId);
console.log('Workspace:', workspace);
// Should be: 00000000-0000-0000-0000-000000000001
```

## Manual Testing Procedure

### Test 1: Fresh Demo Login
1. Clear browser data (cache, cookies, local storage)
2. Navigate to `/`
3. Click "Demo Account" button
4. Click "Sign In"
5. Should redirect to `/dashboard`
6. Check console for demo logs
7. Verify portfolio shows:
   - Total Value: $372,846.25
   - Cash: $125,000.50
   - 5 positions (AAPL, MSFT, NVDA, GOOGL, TSLA)

### Test 2: Demo Data Isolation
1. Log in as demo user
2. Note down portfolio value
3. Log out
4. Log in as real user (or different demo account)
5. Verify data is different
6. Log back in as demo user
7. Verify demo data is reset (fresh)

### Test 3: Demo Trade Simulation
1. Log in as demo user
2. Navigate to Trading Desk
3. Place a demo trade
4. Check browser console for "Demo trade simulated"
5. Verify trade appears in UI
6. Check Supabase `orders` table - should be EMPTY
7. Check Supabase `trades` table - should be EMPTY

### Test 4: Demo Data Persistence
1. Log in as demo user
2. Note portfolio state
3. Refresh page (F5)
4. Verify you need to log in again
5. After login, verify portfolio is reset to default demo state

## Code Locations

Key files to check when debugging:

1. **Auth & Login**
   - `src/stores/authStore.ts` - Demo login logic (line 175)
   - `src/components/auth/AuthPage.tsx` - Login UI
   - `src/utils/demoMode.ts` - Demo activation

2. **Data Service**
   - `src/services/demoDataService.ts` - All demo data
   - `src/hooks/useDemoAware.ts` - Demo detection hook

3. **Portfolio**
   - `src/stores/realPortfolioStore.ts` - Portfolio loading with demo check
   - `src/stores/portfolioStore.ts` - Legacy portfolio store
   - `src/pages/Dashboard.tsx` - Main dashboard UI

4. **Utilities**
   - `src/utils/workspaceInitializer.ts` - Workspace setup
   - `src/utils/auth.ts` - Auth helpers

## Recovery Procedures

### If Demo Account is Completely Broken

1. **Hard Reset Demo Service:**
```javascript
import { demoDataService } from '@/services/demoDataService';
demoDataService.deactivate();
demoDataService.activate();
```

2. **Force Portfolio Reload:**
```javascript
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
useRealPortfolioStore.getState().loadPortfolio();
```

3. **Reset Auth State:**
```javascript
import { useAuthStore } from '@/stores/authStore';
useAuthStore.getState().logout();
// Then log in again
```

4. **Nuclear Option - Full Reset:**
```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear all cookies
document.cookie.split(";").forEach((c) => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// Reload page
window.location.href = '/';
```

## Prevention

### Best Practices

1. **Always Check Demo Status:**
```typescript
import { isDemoUserId } from '@/hooks/useDemoAware';

if (isDemoUserId(user?.id)) {
  // Use demo data
} else {
  // Use real data
}
```

2. **Guard Database Operations:**
```typescript
// Before any Supabase write
if (isDemoUserId(user?.id)) {
  console.log('Demo user - skipping database write');
  return mockResult;
}
```

3. **Test Both Paths:**
- Always test with demo account
- Always test with real account
- Verify they're completely isolated

4. **Log Everything During Development:**
```typescript
console.log('User type:', isDemoUserId(user?.id) ? 'DEMO' : 'REAL');
console.log('Operation:', operationName);
console.log('Will write to DB:', !isDemoUserId(user?.id));
```

## Support

If none of these steps work:

1. Check Git history for recent changes to demo-related files
2. Review recent commits that touched auth or portfolio stores
3. Look for error logs in browser console
4. Check network tab for failed API calls
5. Verify Supabase RLS policies haven't changed
6. Test in incognito/private browsing mode
7. Try different browser

## Success Indicators

You know the demo account is working correctly when:

✅ Console shows demo activation logs
✅ Portfolio displays $372,846.25 total value
✅ Dashboard shows 5 positions
✅ No Supabase queries in network tab (for demo data)
✅ Demo trades don't appear in Supabase tables
✅ Data resets on page refresh
✅ Real users see different data
