# Analyst KPI Lite System

## Overview
Created a simple, auth-free KPI calculation endpoint for the trading app.

## Backend Function: `kpis-lite`

### Location
`supabase/functions/kpis-lite/index.ts`

### Features
- **No authentication required** - Lovable-safe endpoint
- **Pure calculation** - No database dependencies
- **CORS enabled** - Can be called from front-end

### Input Format
```json
{
  "trades": [
    {
      "id": "string",
      "timestamp": "ISO string",
      "symbol": "string",
      "side": "buy or sell",
      "quantity": number,
      "price": number,
      "fees": number,
      "pnl": number (optional)
    }
  ]
}
```

### Output Format
```json
{
  "winRate": 57.14,
  "sharpe": 1.23,
  "maxDrawdown": 23.45,
  "expectancy": 12.50,
  "avgHoldHours": 24,
  "totalPnL": 1250.00,
  "totalTrades": 100,
  "winningTrades": 57,
  "losingTrades": 43,
  "avgWin": 45.50,
  "avgLoss": 32.25
}
```

### KPI Calculations

1. **Win Rate**: `(winningTrades / totalTrades) * 100`
2. **Sharpe Ratio**: `avgReturn / stdDev(returns)`
3. **Max Drawdown**: Peak-to-trough decline as percentage
4. **Expectancy**: Average P&L per trade
5. **Avg Win/Loss**: Mean of positive/negative P&L values

### Error Handling
- `400` - Missing or invalid trades array
- `500` - Calculation error

## Front-End Component: `KPIDisplay`

### Location
`src/components/analyst/KPIDisplay.tsx`

### Features
- Fetches sample trades from database
- Calls `kpis-lite` endpoint via Supabase Functions
- Displays KPIs in grid layout with icons
- Color-coded metrics (green for positive, red for negative)

### Usage
```tsx
import { KPIDisplay } from "@/components/analyst/KPIDisplay"

<KPIDisplay />
```

## Endpoint URL
```
https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/kpis-lite
```

## Configuration
Added to `supabase/config.toml`:
```toml
[functions.kpis-lite]
verify_jwt = false
```

## Integration with Analyst AI
This endpoint can be called by the Analyst AI to provide performance insights without complex dependencies or authentication requirements.
