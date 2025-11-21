# Connection Management System

## Overview

The connection management system provides enterprise-grade reliability, automatic recovery, and continuous operation for all system connections (brokerage, database, API).

## Core Components

### 1. Connection Health Service (`src/services/connectionHealth.ts`)
- **Real-time monitoring** of all connection states
- **Historical tracking** with 100-entry rolling history per connection
- **Latency metrics** and uptime percentage calculations
- **Automatic health checks** every 30 seconds
- **Event emission** for degraded/down connections

### 2. Connection Pool (`src/services/connectionPool.ts`)
- **Efficient resource management** with configurable min/max connections
- **Automatic warmup** to keep connections alive
- **Connection cycling** after max use count
- **Idle connection cleanup** with timeout
- **Load distribution** across available connections

**Default Configuration:**
```typescript
{
  minConnections: 1,
  maxConnections: 5,
  idleTimeout: 300000,     // 5 minutes
  warmupInterval: 60000,   // 1 minute
  maxUseCount: 100
}
```

### 3. Connection Lifecycle Manager (`src/services/connectionLifecycle.ts`)
- **Automatic reconnection** with exponential backoff
- **State persistence** across page reloads
- **Heartbeat monitoring** every 30 seconds
- **Connection state tracking**: initializing → connected → reconnecting → failed
- **Uptime calculation** and disconnect tracking

**Reconnection Strategy:**
- Initial delay: 1 second
- Max delay: 60 seconds (exponential backoff)
- Max attempts: 10 (configurable)

### 4. Circuit Breaker (`src/services/circuitBreaker.ts`)
- **Prevents cascading failures** by temporarily blocking failing operations
- **Three states**: closed (normal) → open (blocking) → half-open (testing)
- **Configurable thresholds** for failures and recovery
- **Automatic recovery** attempts after timeout

**Default Configuration:**
```typescript
{
  failureThreshold: 5,      // Failures before opening
  successThreshold: 2,       // Successes to close from half-open
  timeout: 60000,            // 1 minute before trying half-open
  monitoringPeriod: 120000   // 2 minutes failure window
}
```

### 5. Recovery Manager (`src/services/recoveryManager.ts`)
- **Automatic recovery scheduling** for failed connections
- **Exponential backoff**: 5s → 10s → 20s → ... → 5 minutes max
- **Integrates with circuit breaker** for intelligent retry
- **Recovery exhaustion** after max attempts (10 by default)

### 6. Migration Manager (`src/services/migrationManager.ts`)
- **Safe migration execution** with validation and rollback
- **Step-by-step progress** tracking
- **Dry-run capability** for testing
- **Migration history** with 50-entry limit
- **Automatic rollback** on failure

### 7. Migration Queue (`src/services/migrationQueue.ts`)
- **Priority-based queuing**: critical → high → normal → low
- **Automatic retry** with configurable attempts
- **Queue status tracking** and management
- **One migration at a time** for safety

## Integration

### Dashboard Integration
The Dashboard displays real-time status:
- **System Health**: Overall connection status
- **Connection Pool**: Active/idle/warming connections
- **Lifecycle States**: Current connection states
- **Migration Queue**: Pending/running migrations

### Brokerage Connection Flow
1. **User initiates connection** → validates credentials
2. **Circuit breaker check** → ensures no repeated failures
3. **Migration created** → with validation and rollback steps
4. **Queued with priority** → high priority for user actions
5. **Executed with retry** → up to 2 retries on failure
6. **Pool initialized** → connection added to pool
7. **Lifecycle registered** → automatic reconnection enabled
8. **Health monitoring** → continuous health checks
9. **Recovery enabled** → automatic recovery on failure

## Event System

All components emit events through the global event bus:

```typescript
// Migration events
'migration.started'
'migration.completed'
'migration.failed'
'migration.queued'

// Connection health events
'connection.error'

// Circuit breaker events
'circuit.opened'
'circuit.closed'
'circuit.reset'

// Recovery events
'recovery.exhausted'
'recovery.success'

// Pool events
'pool.initialized'
'pool.connection_acquired'
'pool.connection_released'
'pool.shutdown'

// Lifecycle events
'lifecycle.registered'
'lifecycle.connected'
'lifecycle.reconnecting'
'lifecycle.failed'
```

## Usage Examples

### Register a Brokerage Connection
```typescript
import { connectionLifecycle } from '@/services/connectionLifecycle';
import { connectionPool } from '@/services/connectionPool';
import { circuitBreaker } from '@/services/circuitBreaker';

const connectionId = 'brokerage-alpaca-paper';

// 1. Register circuit breaker
circuitBreaker.register(connectionId, {
  failureThreshold: 3,
  timeout: 120000
});

// 2. Register lifecycle management
connectionLifecycle.register(connectionId, {
  maxReconnectAttempts: 5,
  reconnectDelay: 2000
});

// 3. Initialize connection pool
connectionPool.initialize('brokerage-pool', 'brokerage', {
  minConnections: 1,
  maxConnections: 3
});

// 4. Mark as connected after successful connection
connectionLifecycle.markConnected(connectionId);
```

### Execute a Safe Migration
```typescript
import { migrationManager } from '@/services/migrationManager';
import { migrationQueue } from '@/services/migrationQueue';

// Create migration
const migrationId = migrationManager.createBrokerageConnectionMigration(
  'alpaca',
  apiKey,
  secretKey,
  'paper'
);

// Queue with priority
const queueId = migrationQueue.enqueue(migrationId, workspaceId, 'high', 2);

// Monitor status
const queueStatus = migrationQueue.getStatus();
const queuedItem = migrationQueue.getQueue().find(q => q.id === queueId);
```

### Monitor Connection Health
```typescript
import { connectionHealthService } from '@/services/connectionHealth';

// Register connection
connectionHealthService.registerConnection(
  'database',
  'database',
  'Supabase Database'
);

// Check health
const result = await connectionHealthService.checkConnection('database');

// Get statistics
const avgLatency = connectionHealthService.getAverageLatency('database', 10);
const uptime = connectionHealthService.getUptimePercentage('database');
```

## Performance Characteristics

- **Health Check Latency**: 50-200ms (database), 100-500ms (brokerage)
- **Reconnection Time**: 1-60 seconds (exponential backoff)
- **Pool Warmup**: Every 60 seconds
- **Memory Footprint**: ~5KB per connection (includes history)
- **Event Overhead**: <1ms per event emission

## Best Practices

1. **Always use circuit breakers** for external API calls
2. **Register connections early** in component lifecycle
3. **Monitor queue status** for critical migrations
4. **Set appropriate pool sizes** based on load
5. **Use high priority** for user-initiated actions
6. **Enable lifecycle management** for all persistent connections
7. **Check system health** before critical operations

## Troubleshooting

### Connection keeps failing
1. Check circuit breaker state: `circuitBreaker.getStats(connectionId)`
2. Review connection history: `connectionHealthService.getHealthHistory(connectionId)`
3. Check recovery attempts: `recoveryManager.getRecoveryStatus(connectionId)`
4. Reset if needed: `circuitBreaker.reset(connectionId)`

### Pool exhaustion
1. Check pool stats: `connectionPool.getStats(poolId)`
2. Increase `maxConnections` if needed
3. Reduce `idleTimeout` for faster recycling
4. Check for connection leaks (not releasing)

### Migration stuck
1. Check queue status: `migrationQueue.getStatus()`
2. View migration history: `migrationManager.getHistory()`
3. Cancel if needed: `migrationQueue.cancel(queueId)`
4. Clear queue if necessary: `migrationQueue.clear()`

## Future Enhancements

- [ ] Connection metrics dashboard
- [ ] Alerting system for critical failures
- [ ] Connection load balancing
- [ ] Multi-region support
- [ ] Advanced retry strategies
- [ ] Connection profiling
