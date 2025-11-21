# Demo Account Guide

## Overview
The demo account is a fully isolated sandbox environment that allows users to explore the application without affecting production data or making real trades.

## Demo Account Credentials
- **Email**: `demo@example.com`
- **User ID**: `00000000-0000-0000-0000-000000000000`
- **Workspace ID**: `00000000-0000-0000-0000-000000000001`

## Features

### 1. Complete Data Isolation
The demo account operates independently with:
- Pre-populated mock portfolio with 5 positions (AAPL, MSFT, NVDA, GOOGL, TSLA)
- Simulated trade history (8 historical trades)
- Mock Oracle signals
- Demo market data and news
- Fake candle data for charts
- Pre-calculated KPIs

### 2. No Database Writes
All demo operations are:
- Stored in memory only
- Never written to Supabase
- Reset on page reload
- Completely separate from real user data

### 3. Demo Portfolio
**Total Value**: $372,846.25
**Cash**: $125,000.50
**Equity**: $247,845.75
**Day Change**: +$3,245.67 (+0.88%)

**Positions:**
- AAPL: 150 shares @ $175.32 avg
- MSFT: 75 shares @ $412.45 avg
- NVDA: 45 shares @ $875.20 avg
- GOOGL: 85 shares @ $138.90 avg
- TSLA: 120 shares @ $245.67 avg

### 4. Demo Trading
When the demo user places a trade:
- Order is simulated immediately
- Status set to "filled"
- Commission calculated at 0.1%
- No real broker connection required
- Added to demo trade history

### 5. Demo KPIs
Pre-calculated performance metrics:
- **Win Rate**: 75%
- **Sharpe Ratio**: 1.42
- **Max Drawdown**: -3.2%
- **Total Trades**: 8
- **Total P&L**: $1,167.80
- **Expectancy**: $145.98 per trade

## Implementation

### Key Files
1. **`src/services/demoDataService.ts`**: Central service managing all demo data
2. **`src/hooks/useDemoAware.ts`**: Hook for checking demo status
3. **`src/utils/demoMode.ts`**: Demo initialization utilities
4. **`src/stores/portfolioStore.ts`**: Portfolio store with demo data support

### How It Works

#### 1. Authentication
```typescript
// Demo user logs in via AuthStore
login({ email: 'demo@example.com', password: 'any' })
// → Returns demo user object without Supabase auth
```

#### 2. Demo Activation
```typescript
// On demo login, demoDataService activates
initializeLandingPageDemo()
// → demoDataService.activate()
// → Logs: "✅ Demo mode activated"
```

#### 3. Data Fetching
```typescript
// Portfolio store checks if user is demo
if (isDemoUserId(user?.id)) {
  // Use demo data instead of Supabase
  const portfolio = demoDataService.getPortfolio()
  // → Returns pre-populated demo portfolio
}
```

#### 4. Trade Execution
```typescript
// Demo trades are simulated
if (isDemoUserId(user?.id)) {
  const result = await demoDataService.placeDemoTrade(order)
  // → No broker connection, immediate "fill"
}
```

### Demo Data Service API

```typescript
// Check if demo mode is active
demoDataService.isActiveDemo(): boolean

// Get demo portfolio
demoDataService.getPortfolio(): DemoPortfolio

// Get Oracle signals
demoDataService.getOracleSignals(limit?: number): Signal[]

// Get trade history
demoDataService.getTradeHistory(limit?: number): Trade[]

// Get KPIs
demoDataService.getAnalytics(): KPIs

// Get bot profile
demoDataService.getBotProfile(): BotProfile

// Get candle data
demoDataService.getDemoCandles(symbol, tf, limit): Candle[]

// Simulate trade
demoDataService.placeDemoTrade(order): Promise<TradeResult>

// Get news
demoDataService.getDemoNews(): News[]
```

## Usage in Components

### Check if Demo User
```typescript
import { useDemoAware } from '@/hooks/useDemoAware';

function MyComponent() {
  const { isDemoUser } = useDemoAware();
  
  if (isDemoUser) {
    return <div>Demo Mode Active</div>;
  }
  
  // Regular user logic
}
```

### Use Demo Data
```typescript
import { demoDataService } from '@/services/demoDataService';

// Fetch data based on user type
const fetchPortfolio = async () => {
  if (isDemoUserId(user?.id)) {
    return demoDataService.getPortfolio();
  } else {
    return await supabase.from('portfolio').select('*');
  }
};
```

## Benefits

### For Users
- **No Risk**: Explore all features without real money
- **Pre-Populated**: Immediate data to interact with
- **Educational**: Learn trading concepts safely
- **Fast**: No broker connection delays

### For Developers
- **Clean Separation**: Demo logic isolated from production
- **No Auth Required**: Demo works without Supabase auth
- **Testable**: Easy to test UI with consistent data
- **Maintainable**: All demo logic in one service

## Limitations

### Current Constraints
- Demo data resets on page reload
- No persistence between sessions
- Limited to pre-defined mock data
- Cannot customize demo portfolio

### What Works
✅ Portfolio viewing
✅ Trade simulation
✅ Oracle signals
✅ KPI display
✅ Chart rendering
✅ News viewing

### What Doesn't Work
❌ Real broker connections
❌ Database writes
❌ Data persistence
❌ Cross-session state

## Testing

### Verify Demo Isolation
1. Log in as demo user
2. Place a trade
3. Check Supabase `orders` table → Should be empty
4. Check Supabase `trades` table → Should be empty
5. Refresh page → Demo data resets

### Verify Regular User Isolation
1. Log in as regular user
2. Place a trade
3. Check Supabase tables → Should show real data
4. Refresh page → Real data persists
5. Demo data should not appear

## Future Enhancements

### Potential Improvements
- [ ] Local storage persistence for demo data
- [ ] Customizable demo portfolios
- [ ] Demo account settings
- [ ] Export demo trading history
- [ ] More sophisticated demo scenarios
- [ ] Tutorial mode with guided steps

## Troubleshooting

### Demo Data Not Loading
1. Check console for "✅ Demo mode activated"
2. Verify user ID is `00000000-0000-0000-0000-000000000000`
3. Check `demoDataService.isActiveDemo()` returns `true`
4. Look for errors in `portfolioStore.refreshPortfolio()`

### Demo Data Mixing with Real Data
1. Check `isDemoUserId()` guards in stores
2. Verify workspace ID isolation
3. Check Supabase queries for workspace filtering
4. Review RLS policies for demo workspace

### Demo Trades Hitting Database
1. Verify `executeTrade()` checks `isDemoUserId()`
2. Check edge functions reject demo workspace writes
3. Review RLS policies on orders/trades tables
4. Test with network inspector for unwanted DB calls

## Security Notes

### Demo Account Access
- Demo credentials are public knowledge
- No sensitive data should be associated with demo account
- Demo workspace should have read-only Supabase access
- Real trading features must be disabled for demo

### RLS Policies
The demo workspace should have special RLS policies:
```sql
-- Demo workspace can read but not write
CREATE POLICY "demo_read_only" ON orders
  FOR ALL
  USING (workspace_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (false);
```

## Conclusion

The demo account provides a risk-free environment for users to explore the application while maintaining complete isolation from production data. All demo operations are handled in-memory and never touch the database, ensuring clean separation between demo and real user experiences.
