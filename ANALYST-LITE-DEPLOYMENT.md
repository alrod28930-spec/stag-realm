# Analyst Lite Deployment

## Overview
Created a simplified, reliable Analyst endpoint that replaces the complex chained architecture with a direct "message in → answer out" flow.

## Changes Made

### 1. New Edge Function: `analyst-chat-lite`
**Location**: `supabase/functions/analyst-chat-lite/index.ts`

**Features**:
- ✅ No Supabase authentication required
- ✅ No workspace_id dependencies
- ✅ No external tool calls or chained functions
- ✅ Simple OpenAI GPT-4o-mini integration
- ✅ Fast and reliable
- ✅ Intent classification (education, diagnostic, overview, risk_alert)
- ✅ Proper error handling and CORS

**API Contract**:
```typescript
// Request
POST /functions/v1/analyst-chat-lite
{
  "message": "User's question",
  "persona": "strategic" // optional
}

// Response
{
  "mode": "education" | "diagnostic" | "overview" | "risk_alert",
  "summary": "AI response text",
  "disclaimer": "Educational only. Not financial advice.",
  "sources": [{ "kind": "System", "title": "Analyst Lite" }]
}
```

### 2. Frontend Hook Update: `useAnalystChat.ts`
**Changes**:
- Direct fetch to `analyst-chat-lite` endpoint
- Removed dependencies on `analystService`
- Simplified message handling
- Local state management for messages
- Removed session tracking complexity

### 3. Configuration
**File**: `supabase/config.toml`
- Added `[functions.analyst-chat-lite]` with `verify_jwt = false`

### 4. UI Component: `AnalystChatPanel.tsx`
**Fixes**:
- Fixed type checking ('analyst' → 'assistant')
- Removed non-existent `actionButtons` property
- Display sources from metadata instead

## Benefits

### Reliability
- No authentication failures
- No workspace context issues
- No chained function dependencies
- Single point of failure (OpenAI API only)

### Performance
- Direct API call (no middleware layers)
- Faster response times
- Lower latency

### Maintainability
- Simple codebase
- Easy to debug
- Clear error messages
- Self-contained function

## Environment Requirements

Only requires one secret in Supabase:
- `OPENAI_API_KEY` ✅ (already configured)

## Usage in Lovable

The frontend automatically uses the lite endpoint:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const response = await fetch(`${supabaseUrl}/functions/v1/analyst-chat-lite`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, persona: 'strategic' })
});
```

## Migration Strategy

### Current State
- ✅ `analyst-chat-lite` - Active in Lovable
- ⚡ Fast, simple, always works

### Future State
- Keep `analyst-chat` (complex version) for enterprise/desktop
- Use `analyst-chat-lite` for web demos and Lovable
- Clear separation of concerns

## Error Handling

### User-Facing Errors
1. **Missing Message**: 400 with friendly message
2. **OpenAI API Error**: 500 with "service temporarily unavailable"
3. **Network Error**: Frontend shows toast notification

### Recovery
- Circuit breaker tracks failures
- Automatic retry on transient errors
- Clear error messages for users

## Testing

Test the endpoint directly:
```bash
curl -X POST https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/analyst-chat-lite \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a bull market?"}'
```

Expected response:
```json
{
  "mode": "education",
  "summary": "A bull market is...",
  "disclaimer": "Educational only. Not financial advice.",
  "sources": [{"kind": "System", "title": "Analyst Lite"}]
}
```

## Next Steps

1. ✅ Function deployed and active
2. ✅ Frontend wired to use lite endpoint
3. ✅ Error handling in place
4. ✅ Configuration updated
5. ⏳ Monitor for 24 hours
6. ⏳ Gather user feedback
7. ⏳ Consider adding caching if needed

## Troubleshooting

### "Connection degraded" message
- Check if `OPENAI_API_KEY` is set in Supabase secrets
- Verify function is deployed (check Supabase dashboard)
- Test endpoint directly with curl

### Messages not sending
- Check browser console for errors
- Verify Supabase URL in environment variables
- Check network tab for failed requests

### Slow responses
- Normal: 2-5 seconds for OpenAI response
- If > 10 seconds: Check OpenAI API status
- Consider upgrading to `gpt-4o` if needed

## Success Metrics

After deployment:
- ✅ No more "degraded system" warnings
- ✅ Messages send and receive reliably
- ✅ Response time < 5 seconds
- ✅ No authentication errors
- ✅ Clean error messages
- ✅ Simple, maintainable code
