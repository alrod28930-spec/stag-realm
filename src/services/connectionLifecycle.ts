// connectionLifecycle.ts - Manage connection lifecycle with automatic reconnection

import { eventBus } from './eventBus';
import { connectionHealthService } from './connectionHealth';
import { connectionPool } from './connectionPool';

export type ConnectionState = 
  | 'initializing' 
  | 'connected' 
  | 'reconnecting' 
  | 'disconnected' 
  | 'failed';

export interface ConnectionLifecycle {
  id: string;
  state: ConnectionState;
  lastStateChange: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  lastError?: string;
  connectionStarted: Date;
  totalUptime: number;
  disconnections: number;
}

class ConnectionLifecycleManager {
  private connections: Map<string, ConnectionLifecycle> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen to connection events
    eventBus.on('connection.error', (data) => {
      this.handleConnectionError(data.connectionId, data.error);
    });

    // Load persisted state
    this.loadState();
  }

  /**
   * Register a connection for lifecycle management
   */
  register(
    connectionId: string,
    options?: {
      maxReconnectAttempts?: number;
      reconnectDelay?: number;
      maxReconnectDelay?: number;
    }
  ) {
    if (this.connections.has(connectionId)) {
      console.log(`♻️ Connection ${connectionId} already registered`);
      return;
    }

    const lifecycle: ConnectionLifecycle = {
      id: connectionId,
      state: 'initializing',
      lastStateChange: new Date(),
      reconnectAttempts: 0,
      maxReconnectAttempts: options?.maxReconnectAttempts || 10,
      reconnectDelay: options?.reconnectDelay || 1000,
      maxReconnectDelay: options?.maxReconnectDelay || 60000,
      connectionStarted: new Date(),
      totalUptime: 0,
      disconnections: 0
    };

    this.connections.set(connectionId, lifecycle);
    this.persistState();

    console.log(`♻️ Registered connection lifecycle: ${connectionId}`);

    // Start heartbeat
    this.startHeartbeat(connectionId);

    eventBus.emit('lifecycle.registered', { connectionId });
  }

  /**
   * Mark connection as connected
   */
  markConnected(connectionId: string) {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) {
      console.warn(`⚠️ Connection ${connectionId} not registered`);
      return;
    }

    const previousState = lifecycle.state;
    lifecycle.state = 'connected';
    lifecycle.lastStateChange = new Date();
    lifecycle.reconnectAttempts = 0;
    lifecycle.reconnectDelay = 1000;

    // Clear any pending reconnect timer
    this.clearReconnectTimer(connectionId);

    this.persistState();

    console.log(`✅ Connection ${connectionId} marked as connected (was: ${previousState})`);
    
    eventBus.emit('lifecycle.connected', { connectionId, previousState });
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(connectionId: string, error?: string) {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) return;

    lifecycle.lastError = error;
    lifecycle.disconnections++;

    if (lifecycle.state === 'connected') {
      console.log(`⚠️ Connection ${connectionId} lost, initiating reconnection...`);
      this.initiateReconnection(connectionId);
    }
  }

  /**
   * Initiate reconnection process
   */
  private initiateReconnection(connectionId: string) {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) return;

    lifecycle.state = 'reconnecting';
    lifecycle.lastStateChange = new Date();
    lifecycle.reconnectAttempts++;

    this.persistState();

    // Check if max attempts reached
    if (lifecycle.reconnectAttempts > lifecycle.maxReconnectAttempts) {
      lifecycle.state = 'failed';
      console.error(`❌ Connection ${connectionId} failed after ${lifecycle.maxReconnectAttempts} attempts`);
      
      eventBus.emit('lifecycle.failed', { connectionId });
      return;
    }

    // Calculate backoff delay
    const delay = Math.min(
      lifecycle.reconnectDelay * Math.pow(2, lifecycle.reconnectAttempts - 1),
      lifecycle.maxReconnectDelay
    );

    console.log(
      `🔄 Reconnection attempt ${lifecycle.reconnectAttempts}/${lifecycle.maxReconnectAttempts} ` +
      `for ${connectionId} in ${delay}ms`
    );

    // Schedule reconnection
    const timer = setTimeout(async () => {
      await this.attemptReconnection(connectionId);
    }, delay);

    this.reconnectTimers.set(connectionId, timer);
    
    eventBus.emit('lifecycle.reconnecting', { 
      connectionId, 
      attempt: lifecycle.reconnectAttempts,
      delay 
    });
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(connectionId: string) {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) return;

    console.log(`🔌 Attempting reconnection for ${connectionId}...`);

    try {
      // Check connection health
      const result = await connectionHealthService.checkConnection(connectionId);

      if (result.healthy) {
        this.markConnected(connectionId);
        console.log(`✅ Reconnection successful for ${connectionId}`);
      } else {
        throw new Error(result.error || 'Health check failed');
      }
    } catch (error) {
      console.warn(`⚠️ Reconnection attempt failed:`, error);
      
      // Schedule next attempt
      if (lifecycle.reconnectAttempts < lifecycle.maxReconnectAttempts) {
        this.initiateReconnection(connectionId);
      } else {
        lifecycle.state = 'failed';
        this.persistState();
        
        eventBus.emit('lifecycle.failed', { connectionId });
      }
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(connectionId: string, intervalMs = 30000) {
    // Clear existing
    const existing = this.heartbeatIntervals.get(connectionId);
    if (existing) {
      clearInterval(existing);
    }

    const interval = setInterval(async () => {
      const lifecycle = this.connections.get(connectionId);
      
      if (!lifecycle || lifecycle.state !== 'connected') return;

      // Perform health check
      try {
        const result = await connectionHealthService.checkConnection(connectionId);
        
        if (!result.healthy) {
          console.warn(`💓 Heartbeat failed for ${connectionId}`);
          this.handleConnectionError(connectionId, result.error);
        } else {
          // Update uptime
          lifecycle.totalUptime += intervalMs;
        }
      } catch (error) {
        console.warn(`💓 Heartbeat error for ${connectionId}:`, error);
        this.handleConnectionError(
          connectionId, 
          error instanceof Error ? error.message : 'Heartbeat failed'
        );
      }
    }, intervalMs);

    this.heartbeatIntervals.set(connectionId, interval);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(connectionId: string) {
    const timer = this.reconnectTimers.get(connectionId);
    
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(connectionId: string) {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) {
      console.warn(`⚠️ Connection ${connectionId} not registered`);
      return false;
    }

    // Reset attempts for manual reconnect
    lifecycle.reconnectAttempts = 0;
    
    await this.attemptReconnection(connectionId);
    
    return lifecycle.state === 'connected';
  }

  /**
   * Get connection lifecycle info
   */
  getLifecycle(connectionId: string): ConnectionLifecycle | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all lifecycles
   */
  getAllLifecycles(): ConnectionLifecycle[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection uptime percentage
   */
  getUptimePercentage(connectionId: string): number {
    const lifecycle = this.connections.get(connectionId);
    
    if (!lifecycle) return 0;

    const totalTime = Date.now() - lifecycle.connectionStarted.getTime();
    if (totalTime === 0) return 100;

    return (lifecycle.totalUptime / totalTime) * 100;
  }

  /**
   * Persist state to localStorage
   */
  private persistState() {
    try {
      const data = Array.from(this.connections.entries()).map(([id, lifecycle]) => ({
        id,
        state: lifecycle.state,
        lastStateChange: lifecycle.lastStateChange.toISOString(),
        reconnectAttempts: lifecycle.reconnectAttempts,
        connectionStarted: lifecycle.connectionStarted.toISOString(),
        totalUptime: lifecycle.totalUptime,
        disconnections: lifecycle.disconnections
      }));

      localStorage.setItem('connection_lifecycle', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist connection lifecycle:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState() {
    try {
      const stored = localStorage.getItem('connection_lifecycle');
      
      if (stored) {
        const data = JSON.parse(stored);
        
        data.forEach((item: any) => {
          // Only restore if recent (within last hour)
          const lastChange = new Date(item.lastStateChange);
          const hourAgo = Date.now() - 3600000;
          
          if (lastChange.getTime() > hourAgo) {
            this.connections.set(item.id, {
              ...item,
              lastStateChange: new Date(item.lastStateChange),
              connectionStarted: new Date(item.connectionStarted),
              maxReconnectAttempts: 10,
              reconnectDelay: 1000,
              maxReconnectDelay: 60000
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load connection lifecycle:', error);
    }
  }

  /**
   * Unregister a connection
   */
  unregister(connectionId: string) {
    this.clearReconnectTimer(connectionId);
    
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }

    this.connections.delete(connectionId);
    this.persistState();

    console.log(`♻️ Unregistered connection lifecycle: ${connectionId}`);
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Clear all timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    this.reconnectTimers.clear();
    this.heartbeatIntervals.clear();
    this.connections.clear();
  }
}

// Export singleton instance
export const connectionLifecycle = new ConnectionLifecycleManager();
