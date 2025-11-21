# System Audit & Health Monitoring Guide

## Overview

The enhanced system audit and health monitoring system provides comprehensive diagnostics, real-time monitoring, and auto-healing capabilities for the entire application stack.

## Key Components

### 1. Enhanced System Auditor (`src/utils/systemAudit.ts`)

Comprehensive auditing system that checks:
- ✅ Authentication state consistency
- ✅ Database integrity and RLS policies
- ✅ Security configurations
- ✅ Performance metrics and memory usage
- ✅ Data integrity (orphaned records)
- ✅ Connection health across all services
- ✅ Connection pool utilization
- ✅ Lifecycle states and uptime
- ✅ Circuit breaker status
- ✅ Recovery manager activity
- ✅ Migration queue status
- ✅ Analyst AI cache performance
- ✅ Event bus health

**Key Methods:**
```typescript
// Run complete system audit
const results = await systemAuditor.runComprehensiveAudit();

// Get summary of audit results
const summary = systemAuditor.getSummary();
// Returns: { total, critical, warnings, info, fixed, autoFixable, ready }

// Auto-heal fixable issues
const { fixed, failed } = await systemAuditor.autoHeal();

// Get detailed results
const issues = systemAuditor.getResults();
```

### 2. Auto-Healing System

The auditor can automatically fix certain types of issues:

**Auto-Fixable Issues:**
- 🔧 Connection pool health issues
- 🔧 Circuit breakers stuck open
- 🔧 Stuck lifecycle reconnections
- 🔧 Stalled migration queue
- 🔧 Bloated analyst cache
- 🔧 Excessive event listeners

**Safety Features:**
- Max 3 auto-fix attempts per issue
- Detailed logging of all auto-fix attempts
- Graceful fallback if auto-fix fails
- Re-audit after healing to verify fixes

### 3. System Health Monitor (`src/components/debug/SystemHealthMonitor.tsx`)

Comprehensive UI for monitoring and diagnostics:

**Features:**
- 📊 Real-time metrics dashboard
- 🔍 Detailed audit results with severity indicators
- ⚡ One-click auto-heal for fixable issues
- 📈 Live connection pool stats
- 🔄 Lifecycle state monitoring
- ⚡ Circuit breaker status
- 💾 Analyst cache performance
- 🔧 Service health breakdown

**Access:**
Navigate to `/system-monitor` or from Settings → System Health

### 4. System Initializer (`src/services/systemInitializer.ts`)

Automatic startup initialization and health checks:

**Initialization Phases:**
1. **Core Services**: Event bus, logging
2. **Connection Management**: Health service, pools, lifecycle, circuit breakers
3. **Intelligence Systems**: Analyst cache, ML models
4. **Health Check**: Comprehensive system audit
5. **Auto-Heal**: Fix critical issues automatically

**Usage:**
```typescript
// Runs automatically on app startup
// Manual re-initialization:
const result = await systemInitializer.reinitialize();

// Check initialization status
const status = systemInitializer.getInitializationStatus();
```

## Audit Categories & Checks

### Authentication
- Auth state consistency
- Session validity
- Demo user configuration
- Session/store synchronization

### Database
- Profile record existence
- Workspace membership
- RLS policy enforcement
- Connection integrity

### Security
- RLS enforcement validation
- Demo credentials in production
- Sensitive data exposure
- Permission configurations

### Performance
- Excessive auth listeners
- LocalStorage bloat
- Memory leaks
- Event listener accumulation

### Data Integrity
- Orphaned bot profiles
- Missing foreign keys
- Data consistency
- Referential integrity

### Connection Health
- Connection status (healthy/degraded/down)
- High latency detection
- Error rate monitoring
- Uptime tracking

### Connection Pools
- Minimum connection count
- Pool saturation detection
- High utilization warnings
- Idle connection management

### Lifecycle States
- Stuck reconnection detection
- Disconnection monitoring
- Low uptime alerts
- Backoff exhaustion

### Circuit Breakers
- Open circuit detection
- Stuck open circuits
- Half-open testing status
- Failure rate monitoring

### Recovery Manager
- Active recovery count
- Success/failure rates
- Exhausted strategies
- Recovery backoff status

### Migration Queue
- Queue length monitoring
- Stalled queue detection
- Failed migration tracking
- Processing status

### Analyst System
- Cache hit rate
- Memory usage
- Cache capacity
- Query performance

## Severity Levels

### Critical 🔴
- Requires immediate attention
- System functionality impaired
- Data integrity at risk
- Security vulnerabilities

**Examples:**
- Database connection failed
- RLS not enforced
- Auth session mismatch
- Circuit breaker stuck open

### Warning ⚠️
- Should be addressed soon
- May cause degraded performance
- Potential future issues
- Sub-optimal configuration

**Examples:**
- High latency connections
- Low cache hit rate
- Pool near capacity
- Reconnection loops

### Info ℹ️
- Informational only
- Normal operation status
- Optimization opportunities
- Best practice recommendations

**Examples:**
- Cache statistics
- Utilization metrics
- System state changes
- Performance tips

## Integration with System Coordination

### Event System Integration

The audit system integrates with the event bus:

```typescript
// Audit events
eventBus.on('system.audit.started', (data) => {});
eventBus.on('system.audit.complete', (data) => {});
eventBus.on('system.autoHeal.started', (data) => {});
eventBus.on('system.autoHeal.complete', (data) => {});

// Service events
eventBus.on('service.initialized', (data) => {});
eventBus.on('service.degraded', (data) => {});
eventBus.on('service.failed', (data) => {});
```

### Coordination with Other Services

The audit system coordinates with:
- **Connection Health Service**: Real-time status
- **Connection Pool**: Resource utilization
- **Connection Lifecycle**: Reconnection management
- **Circuit Breaker**: Failure prevention
- **Recovery Manager**: Automatic recovery
- **Migration Queue**: Safe migrations
- **Analyst Cache**: Performance optimization

## Usage Examples

### Run Manual Audit

```typescript
import { systemAuditor } from '@/utils/systemAudit';

// Run audit and get results
const results = await systemAuditor.runComprehensiveAudit();
const summary = systemAuditor.getSummary();

console.log(`Found ${summary.total} issues:`);
console.log(`- Critical: ${summary.critical}`);
console.log(`- Warnings: ${summary.warnings}`);
console.log(`- Info: ${summary.info}`);
console.log(`- Auto-fixable: ${summary.autoFixable}`);

// Check if system is ready
if (summary.ready) {
  console.log('✅ System is healthy');
} else {
  console.log('❌ System has critical issues');
}
```

### Auto-Heal Issues

```typescript
// Run audit first
await systemAuditor.runComprehensiveAudit();

// Attempt auto-healing
const { fixed, failed } = await systemAuditor.autoHeal();

console.log(`Fixed ${fixed} issues`);
console.log(`Failed to fix ${failed} issues`);

// Re-audit to verify
await systemAuditor.runComprehensiveAudit();
```

### Scheduled Health Checks

```typescript
// Run audit every 5 minutes
setInterval(async () => {
  const results = await systemAuditor.runComprehensiveAudit();
  const summary = systemAuditor.getSummary();
  
  if (summary.critical > 0) {
    // Alert team or auto-heal
    await systemAuditor.autoHeal();
    
    // Notify via event bus
    eventBus.emit('system.alert', {
      severity: 'critical',
      message: `${summary.critical} critical issues detected`,
      summary
    });
  }
}, 300000);
```

### Integration in Components

```typescript
import { useEffect, useState } from 'react';
import { systemAuditor } from '@/utils/systemAuditor';

function SystemStatusWidget() {
  const [summary, setSummary] = useState(null);
  
  useEffect(() => {
    const runCheck = async () => {
      await systemAuditor.runComprehensiveAudit();
      setSummary(systemAuditor.getSummary());
    };
    
    runCheck();
    const interval = setInterval(runCheck, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  if (!summary) return <div>Loading...</div>;
  
  return (
    <div className={summary.ready ? 'healthy' : 'issues'}>
      <h3>System Status</h3>
      <p>Critical: {summary.critical}</p>
      <p>Warnings: {summary.warnings}</p>
      {summary.autoFixable > 0 && (
        <button onClick={() => systemAuditor.autoHeal()}>
          Auto-Heal ({summary.autoFixable})
        </button>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Regular Audits
Run comprehensive audits:
- On application startup
- After major user actions
- Every 5-10 minutes in production
- Before critical operations

### 2. Monitor Critical Issues
Always check for critical issues:
- Before trading operations
- Before data migrations
- After deployments
- During high-traffic periods

### 3. Use Auto-Heal Wisely
Auto-heal is safe but:
- Review auto-fix logs
- Monitor success rates
- Fall back to manual fixes if auto-heal fails repeatedly
- Don't auto-heal in production without monitoring

### 4. Track Trends
Monitor audit metrics over time:
- Issue frequency
- Fix success rates
- System health trends
- Performance degradation

### 5. Integration Testing
Test audit system:
- Simulate failure scenarios
- Verify auto-heal works
- Test critical issue detection
- Validate event emission

## Troubleshooting

### Audit Takes Too Long
- Reduce audit frequency
- Skip non-critical checks
- Optimize database queries
- Check for hung connections

### Auto-Heal Not Working
- Check logs for errors
- Verify fix implementation
- Increase max attempts
- Fall back to manual fixes

### False Positives
- Adjust thresholds
- Update detection logic
- Add context checks
- Improve heuristics

### Missing Issues
- Add new audit checks
- Expand coverage
- Monitor logs for patterns
- Update detection rules

## Performance Considerations

### Audit Performance
- Full audit: ~2-5 seconds
- Connection checks: ~100-500ms
- Cache checks: ~50ms
- Database checks: ~200-1000ms

### Memory Usage
- Audit results: ~1-5KB per issue
- History tracking: Configurable limit
- Cache overhead: Minimal

### CPU Usage
- Audit process: Low
- Auto-heal: Minimal
- Real-time monitoring: Negligible

## Future Enhancements

- [ ] Predictive issue detection
- [ ] Machine learning for anomaly detection
- [ ] Advanced auto-healing strategies
- [ ] Distributed audit coordination
- [ ] Historical trend analysis
- [ ] Automated performance tuning
- [ ] Integration with external monitoring
- [ ] Real-time alerting system
