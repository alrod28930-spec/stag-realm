// circuitBreaker.ts - Circuit breaker pattern to prevent cascading failures

import { eventBus } from './eventBus';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;                // Time in ms to wait before trying half-open
  monitoringPeriod: number;       // Time window to count failures
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttemptTime: Date | null;
}

class CircuitBreaker {
  private circuits: Map<string, CircuitBreakerStats> = new Map();
  private configs: Map<string, CircuitBreakerConfig> = new Map();
  private failureTimestamps: Map<string, Date[]> = new Map();

  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringPeriod: 120000 // 2 minutes
  };

  /**
   * Register a circuit with custom config
   */
  register(id: string, config?: Partial<CircuitBreakerConfig>) {
    this.configs.set(id, { ...this.defaultConfig, ...config });
    this.circuits.set(id, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextAttemptTime: null
    });
    this.failureTimestamps.set(id, []);
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(
    id: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.circuits.has(id)) {
      this.register(id);
    }

    const stats = this.circuits.get(id)!;
    const config = this.configs.get(id)!;

    // Check if circuit is open
    if (stats.state === 'open') {
      const now = Date.now();
      if (stats.nextAttemptTime && now < stats.nextAttemptTime.getTime()) {
        console.log(`⚡ Circuit ${id} is OPEN, rejecting call`);
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is open for ${id}`);
      }
      // Try half-open
      stats.state = 'half-open';
      stats.successes = 0;
      console.log(`⚡ Circuit ${id} entering HALF-OPEN state`);
    }

    try {
      const result = await operation();
      this.recordSuccess(id);
      return result;
    } catch (error) {
      this.recordFailure(id);
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(id: string) {
    const stats = this.circuits.get(id)!;
    const config = this.configs.get(id)!;

    stats.successes++;
    stats.lastSuccessTime = new Date();

    if (stats.state === 'half-open') {
      if (stats.successes >= config.successThreshold) {
        stats.state = 'closed';
        stats.failures = 0;
        stats.successes = 0;
        this.failureTimestamps.set(id, []);
        console.log(`⚡ Circuit ${id} CLOSED - recovered successfully`);
        
        eventBus.emit('circuit.closed', { circuitId: id });
      }
    } else if (stats.state === 'closed') {
      // Reset failure count on success
      this.cleanOldFailures(id);
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(id: string) {
    const stats = this.circuits.get(id)!;
    const config = this.configs.get(id)!;
    const timestamps = this.failureTimestamps.get(id)!;

    stats.failures++;
    stats.lastFailureTime = new Date();
    timestamps.push(new Date());

    // Clean old failures outside monitoring period
    this.cleanOldFailures(id);

    const recentFailures = this.failureTimestamps.get(id)!.length;

    if (stats.state === 'half-open') {
      // Any failure in half-open state reopens the circuit
      stats.state = 'open';
      stats.nextAttemptTime = new Date(Date.now() + config.timeout);
      console.log(`⚡ Circuit ${id} OPENED - failed during recovery`);
      
      eventBus.emit('circuit.opened', { circuitId: id, reason: 'recovery_failed' });
    } else if (stats.state === 'closed' && recentFailures >= config.failureThreshold) {
      stats.state = 'open';
      stats.nextAttemptTime = new Date(Date.now() + config.timeout);
      console.log(`⚡ Circuit ${id} OPENED - failure threshold exceeded (${recentFailures}/${config.failureThreshold})`);
      
      eventBus.emit('circuit.opened', { 
        circuitId: id, 
        reason: 'threshold_exceeded',
        failures: recentFailures 
      });
    }
  }

  /**
   * Clean failures outside monitoring period
   */
  private cleanOldFailures(id: string) {
    const config = this.configs.get(id)!;
    const timestamps = this.failureTimestamps.get(id)!;
    const cutoff = Date.now() - config.monitoringPeriod;
    
    const recentFailures = timestamps.filter(t => t.getTime() > cutoff);
    this.failureTimestamps.set(id, recentFailures);
  }

  /**
   * Get circuit statistics
   */
  getStats(id: string): CircuitBreakerStats | null {
    return this.circuits.get(id) || null;
  }

  /**
   * Get all circuit statistics
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    return new Map(this.circuits);
  }

  /**
   * Manually reset a circuit
   */
  reset(id: string) {
    const stats = this.circuits.get(id);
    if (stats) {
      stats.state = 'closed';
      stats.failures = 0;
      stats.successes = 0;
      stats.nextAttemptTime = null;
      this.failureTimestamps.set(id, []);
      
      console.log(`⚡ Circuit ${id} manually RESET`);
      eventBus.emit('circuit.reset', { circuitId: id });
    }
  }

  /**
   * Check if circuit allows requests
   */
  canExecute(id: string): boolean {
    const stats = this.circuits.get(id);
    if (!stats) return true;

    if (stats.state === 'open') {
      const now = Date.now();
      if (stats.nextAttemptTime && now < stats.nextAttemptTime.getTime()) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const circuitBreaker = new CircuitBreaker();
