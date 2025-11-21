// connectionHealth.ts - Monitor and track connection health across the system

import { supabase } from '@/integrations/supabase/client';
import { eventBus } from './eventBus';

export interface ConnectionHealth {
  id: string;
  type: 'brokerage' | 'database' | 'api';
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: Date;
  lastSuccess: Date | null;
  errorCount: number;
  latencyMs: number | null;
  metadata?: any;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
  metadata?: any;
}

class ConnectionHealthService {
  private connections: Map<string, ConnectionHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(connections: ConnectionHealth[]) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Load health status from localStorage
    try {
      const stored = localStorage.getItem('connection_health');
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((conn: any) => {
          this.connections.set(conn.id, {
            ...conn,
            lastCheck: new Date(conn.lastCheck),
            lastSuccess: conn.lastSuccess ? new Date(conn.lastSuccess) : null
          });
        });
      }
    } catch (error) {
      console.error('Failed to load connection health:', error);
    }

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start automatic health monitoring
   */
  startMonitoring(intervalMs = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkAllConnections();
    }, intervalMs);

    // Initial check
    this.checkAllConnections();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register a connection for monitoring
   */
  registerConnection(
    id: string,
    type: ConnectionHealth['type'],
    name: string,
    metadata?: any
  ) {
    if (!this.connections.has(id)) {
      this.connections.set(id, {
        id,
        type,
        name,
        status: 'unknown',
        lastCheck: new Date(),
        lastSuccess: null,
        errorCount: 0,
        latencyMs: null,
        metadata
      });
      this.persist();
      this.notifyListeners();
    }
  }

  /**
   * Check health of a specific connection
   */
  async checkConnection(id: string): Promise<HealthCheckResult> {
    const conn = this.connections.get(id);
    if (!conn) {
      return { healthy: false, latencyMs: 0, error: 'Connection not registered' };
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      switch (conn.type) {
        case 'brokerage':
          result = await this.checkBrokerageHealth(conn);
          break;
        case 'database':
          result = await this.checkDatabaseHealth();
          break;
        case 'api':
          result = await this.checkApiHealth(conn);
          break;
        default:
          result = { healthy: false, latencyMs: 0, error: 'Unknown connection type' };
      }
    } catch (error) {
      result = {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Update connection status
    this.updateConnectionStatus(id, result);

    return result;
  }

  /**
   * Check all registered connections
   */
  async checkAllConnections() {
    const checks = Array.from(this.connections.keys()).map(id => 
      this.checkConnection(id)
    );
    await Promise.allSettled(checks);
  }

  /**
   * Check brokerage connection health
   */
  private async checkBrokerageHealth(conn: ConnectionHealth): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase
        .from('broker_health')
        .select('status, last_check')
        .eq('broker', conn.metadata?.broker || 'alpaca')
        .maybeSingle();

      if (error) throw error;

      const latencyMs = Date.now() - startTime;

      if (!data) {
        return { healthy: false, latencyMs, error: 'No health data found' };
      }

      return {
        healthy: data.status === 'ok',
        latencyMs,
        metadata: data
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Check database connection health
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { error } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1);

      if (error) throw error;

      return {
        healthy: true,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      };
    }
  }

  /**
   * Check API health
   */
  private async checkApiHealth(conn: ConnectionHealth): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Generic API health check using edge function
      const { error } = await supabase.functions.invoke('health', {
        body: { service: conn.metadata?.service || 'default' }
      });

      if (error) throw error;

      return {
        healthy: true,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'API check failed'
      };
    }
  }

  /**
   * Update connection status based on check result
   */
  private updateConnectionStatus(id: string, result: HealthCheckResult) {
    const conn = this.connections.get(id);
    if (!conn) return;

    conn.lastCheck = new Date();
    conn.latencyMs = result.latencyMs;

    if (result.healthy) {
      conn.status = 'healthy';
      conn.lastSuccess = new Date();
      conn.errorCount = 0;
    } else {
      conn.errorCount++;
      
      // Determine status based on error count and recency
      if (conn.errorCount >= 3) {
        conn.status = 'down';
      } else if (conn.errorCount >= 1) {
        conn.status = 'degraded';
      }

      // Emit error event
      eventBus.emit('connection.error', {
        connectionId: id,
        type: conn.type,
        name: conn.name,
        error: result.error,
        errorCount: conn.errorCount
      });
    }

    this.persist();
    this.notifyListeners();
  }

  /**
   * Get health status of a connection
   */
  getConnectionHealth(id: string): ConnectionHealth | null {
    return this.connections.get(id) || null;
  }

  /**
   * Get all connection health statuses
   */
  getAllConnections(): ConnectionHealth[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    total: number;
  } {
    const connections = this.getAllConnections();
    const healthyCount = connections.filter(c => c.status === 'healthy').length;
    const degradedCount = connections.filter(c => c.status === 'degraded').length;
    const downCount = connections.filter(c => c.status === 'down').length;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (downCount > 0) {
      status = 'critical';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      healthyCount,
      degradedCount,
      downCount,
      total: connections.length
    };
  }

  /**
   * Subscribe to health changes
   */
  subscribe(callback: (connections: ConnectionHealth[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const connections = this.getAllConnections();
    this.listeners.forEach(callback => callback(connections));
  }

  /**
   * Persist health data to localStorage
   */
  private persist() {
    try {
      const data = this.getAllConnections();
      localStorage.setItem('connection_health', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist connection health:', error);
    }
  }

  /**
   * Clear all health data
   */
  clear() {
    this.connections.clear();
    localStorage.removeItem('connection_health');
    this.notifyListeners();
  }

  /**
   * Cleanup on unmount
   */
  cleanup() {
    this.stopMonitoring();
    this.listeners.clear();
  }
}

// Export singleton instance
export const connectionHealthService = new ConnectionHealthService();
