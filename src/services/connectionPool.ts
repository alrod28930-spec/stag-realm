// connectionPool.ts - Connection pooling for efficient resource management

import { eventBus } from './eventBus';
import { connectionHealthService } from './connectionHealth';

export interface PooledConnection {
  id: string;
  type: 'brokerage' | 'database' | 'api';
  status: 'idle' | 'active' | 'warming' | 'cooling';
  lastUsed: Date;
  useCount: number;
  created: Date;
  metadata?: any;
}

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;      // Time before idle connection is released
  warmupInterval: number;   // Interval to keep connections warm
  maxUseCount: number;      // Max uses before cycling connection
}

class ConnectionPool {
  private pools: Map<string, PooledConnection[]> = new Map();
  private configs: Map<string, PoolConfig> = new Map();
  private warmupIntervals: Map<string, NodeJS.Timeout> = new Map();

  private defaultConfig: PoolConfig = {
    minConnections: 1,
    maxConnections: 5,
    idleTimeout: 300000,     // 5 minutes
    warmupInterval: 60000,   // 1 minute
    maxUseCount: 100
  };

  /**
   * Initialize a connection pool
   */
  initialize(
    poolId: string,
    type: 'brokerage' | 'database' | 'api',
    config?: Partial<PoolConfig>
  ) {
    const poolConfig = { ...this.defaultConfig, ...config };
    this.configs.set(poolId, poolConfig);
    this.pools.set(poolId, []);

    console.log(`🏊 Initialized connection pool: ${poolId}`);

    // Create minimum connections
    this.ensureMinConnections(poolId, type);

    // Start warmup cycle
    this.startWarmupCycle(poolId);

    eventBus.emit('pool.initialized', { poolId, config: poolConfig });
  }

  /**
   * Ensure minimum number of connections exist
   */
  private async ensureMinConnections(poolId: string, type: PooledConnection['type']) {
    const pool = this.pools.get(poolId);
    const config = this.configs.get(poolId);
    
    if (!pool || !config) return;

    const currentCount = pool.length;
    const needed = config.minConnections - currentCount;

    if (needed > 0) {
      console.log(`🏊 Pool ${poolId}: Creating ${needed} connections to meet minimum`);
      
      for (let i = 0; i < needed; i++) {
        const connection = this.createConnection(poolId, type);
        pool.push(connection);
      }
    }
  }

  /**
   * Create a new pooled connection
   */
  private createConnection(poolId: string, type: PooledConnection['type']): PooledConnection {
    const id = `${poolId}-conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      type,
      status: 'idle',
      lastUsed: new Date(),
      useCount: 0,
      created: new Date()
    };
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(poolId: string): Promise<PooledConnection | null> {
    const pool = this.pools.get(poolId);
    const config = this.configs.get(poolId);
    
    if (!pool || !config) {
      console.warn(`⚠️ Pool ${poolId} not initialized`);
      return null;
    }

    // Try to find an idle connection
    let connection = pool.find(c => c.status === 'idle');

    if (!connection) {
      // No idle connections, check if we can create more
      if (pool.length < config.maxConnections) {
        console.log(`🏊 Pool ${poolId}: Creating new connection (${pool.length + 1}/${config.maxConnections})`);
        const type = pool[0]?.type || 'api';
        connection = this.createConnection(poolId, type);
        pool.push(connection);
      } else {
        console.warn(`⚠️ Pool ${poolId}: No available connections (max reached)`);
        return null;
      }
    }

    // Mark as active
    connection.status = 'active';
    connection.lastUsed = new Date();
    connection.useCount++;

    console.log(`🏊 Pool ${poolId}: Acquired connection ${connection.id} (use #${connection.useCount})`);
    
    eventBus.emit('pool.connection_acquired', { poolId, connectionId: connection.id });

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  release(poolId: string, connectionId: string) {
    const pool = this.pools.get(poolId);
    const config = this.configs.get(poolId);
    
    if (!pool || !config) return;

    const connection = pool.find(c => c.id === connectionId);
    
    if (!connection) {
      console.warn(`⚠️ Connection ${connectionId} not found in pool ${poolId}`);
      return;
    }

    // Check if connection should be cycled
    if (connection.useCount >= config.maxUseCount) {
      console.log(`🏊 Pool ${poolId}: Cycling connection ${connectionId} (max uses reached)`);
      this.removeConnection(poolId, connectionId);
      
      // Create replacement if below minimum
      const type = connection.type;
      this.ensureMinConnections(poolId, type);
      return;
    }

    // Return to idle
    connection.status = 'idle';
    connection.lastUsed = new Date();

    console.log(`🏊 Pool ${poolId}: Released connection ${connectionId}`);
    
    eventBus.emit('pool.connection_released', { poolId, connectionId });
  }

  /**
   * Remove a connection from the pool
   */
  private removeConnection(poolId: string, connectionId: string) {
    const pool = this.pools.get(poolId);
    
    if (!pool) return;

    const index = pool.findIndex(c => c.id === connectionId);
    
    if (index !== -1) {
      pool.splice(index, 1);
      console.log(`🏊 Pool ${poolId}: Removed connection ${connectionId}`);
    }
  }

  /**
   * Start warmup cycle to keep connections alive
   */
  private startWarmupCycle(poolId: string) {
    const config = this.configs.get(poolId);
    
    if (!config) return;

    // Clear existing interval
    const existing = this.warmupIntervals.get(poolId);
    if (existing) {
      clearInterval(existing);
    }

    // Start new interval
    const interval = setInterval(() => {
      this.warmupPool(poolId);
      this.cleanupIdleConnections(poolId);
    }, config.warmupInterval);

    this.warmupIntervals.set(poolId, interval);
  }

  /**
   * Warm up connections by checking their health
   */
  private async warmupPool(poolId: string) {
    const pool = this.pools.get(poolId);
    
    if (!pool) return;

    console.log(`🔥 Warming up pool: ${poolId}`);

    for (const connection of pool) {
      if (connection.status === 'idle') {
        connection.status = 'warming';
        
        // Perform lightweight health check
        try {
          await connectionHealthService.checkConnection(connection.id);
          connection.status = 'idle';
          connection.lastUsed = new Date();
        } catch (error) {
          console.warn(`⚠️ Warmup failed for ${connection.id}:`, error);
          this.removeConnection(poolId, connection.id);
        }
      }
    }
  }

  /**
   * Clean up idle connections that exceeded timeout
   */
  private cleanupIdleConnections(poolId: string) {
    const pool = this.pools.get(poolId);
    const config = this.configs.get(poolId);
    
    if (!pool || !config) return;

    const now = Date.now();
    const toRemove: string[] = [];

    for (const connection of pool) {
      if (connection.status === 'idle') {
        const idleTime = now - connection.lastUsed.getTime();
        
        if (idleTime > config.idleTimeout && pool.length > config.minConnections) {
          toRemove.push(connection.id);
        }
      }
    }

    if (toRemove.length > 0) {
      console.log(`🧹 Pool ${poolId}: Cleaning up ${toRemove.length} idle connections`);
      
      toRemove.forEach(id => this.removeConnection(poolId, id));
    }
  }

  /**
   * Get pool statistics
   */
  getStats(poolId: string): {
    total: number;
    idle: number;
    active: number;
    warming: number;
    minConnections: number;
    maxConnections: number;
  } | null {
    const pool = this.pools.get(poolId);
    const config = this.configs.get(poolId);
    
    if (!pool || !config) return null;

    return {
      total: pool.length,
      idle: pool.filter(c => c.status === 'idle').length,
      active: pool.filter(c => c.status === 'active').length,
      warming: pool.filter(c => c.status === 'warming').length,
      minConnections: config.minConnections,
      maxConnections: config.maxConnections
    };
  }

  /**
   * Get all pool statistics
   */
  getAllStats(): Map<string, ReturnType<typeof this.getStats>> {
    const stats = new Map();
    
    for (const poolId of this.pools.keys()) {
      stats.set(poolId, this.getStats(poolId));
    }
    
    return stats;
  }

  /**
   * Shutdown a pool
   */
  shutdown(poolId: string) {
    const interval = this.warmupIntervals.get(poolId);
    
    if (interval) {
      clearInterval(interval);
      this.warmupIntervals.delete(poolId);
    }

    this.pools.delete(poolId);
    this.configs.delete(poolId);

    console.log(`🏊 Pool ${poolId} shut down`);
    
    eventBus.emit('pool.shutdown', { poolId });
  }

  /**
   * Cleanup all pools
   */
  cleanup() {
    for (const poolId of this.pools.keys()) {
      this.shutdown(poolId);
    }
  }
}

// Export singleton instance
export const connectionPool = new ConnectionPool();
