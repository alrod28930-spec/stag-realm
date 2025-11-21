# Analyst System Overhaul - Multi-Phase Operation

## Issues Identified

### 1. **Personality System Complexity**
- Multiple persona systems (ANALYST_PERSONAS, ANALYST_PERSONALITIES)
- Persona selection UI in multiple components
- Gender-based personality variants
- Unused personality preferences

### 2. **Architectural Issues**
- Duplicate chat implementations (AnalystChatPanel vs Analyst page)
- Multiple analyst engines (v1 deterministic, v2 service-based)
- Confusing separation between analyst.ts and analyst/engine.ts
- Multiple edge functions (analyst-chat, analyst-chat-enhanced, analyst-chat-streaming)
- Unused analyst provider (src/analyst/provider.ts)

### 3. **Degraded System**
- Circuit breaker not properly integrated
- Connection health monitoring incomplete
- Cache not optimally utilized
- Event bus listeners not cleaned up properly

## Multi-Phase Fix Plan

### Phase 1: Simplify Personality System ✅
- Remove all persona selection UI
- Set single default personality: "Strategic Analyst"
- Remove personality from chat messages
- Update edge function to use fixed prompt

### Phase 2: Consolidate Chat Implementation ✅
- Use AnalystChatPanel as primary interface
- Remove old chat code from Analyst page
- Keep streaming implementation
- Remove unused edge functions

### Phase 3: Clean Up Architecture ✅
- Remove unused analyst/engine.ts (v1 deterministic)
- Remove unused analyst/provider.ts
- Keep consolidated analyst.ts service
- Remove personality logic from all services

### Phase 4: Fix System Health ✅
- Properly integrate circuit breaker
- Complete connection health monitoring
- Optimize cache usage
- Fix event bus cleanup

## Single Analyst Personality

**Strategic Financial Analyst**
- Professional, data-driven tone
- Educational focus (not financial advice)
- Clear explanations with concrete examples
- Risk-aware and compliance-focused
- Technical accuracy with accessibility

## Implementation Status

All phases completed. System now has:
- Single unified analyst personality
- Streamlined chat interface
- One edge function (analyst-chat-streaming)
- Clean architecture with proper health monitoring
- No unnecessary complexity
