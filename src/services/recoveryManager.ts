// recoveryManager.ts - Automatic recovery system for failed connections

import { eventBus } from './eventBus';
import { connectionHealthService } from './connectionHealth';
import { circuitBreaker } from './circuitBreaker';

export interface RecoveryStrategy {
  id: string;
  connectionId: string;
  attempts: number;
  maxAttempts: number;
  nextAttempt: Date | null;
  backoffMs: number;
  maxBackoffMs: number;
  lastAttempt: Date | null;
  status: 'active' | 'paused' | 'exhausted' | 'recovered';
}

class RecoveryManager {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryInterval: NodeJS.Timeout | null = null;
  private enabled = true;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for connection errors
    eventBus.on('connection.error', (data) => {
      this.scheduleRecovery(data.connectionId);
    });

    // Listen for circuit breaker events
    eventBus.on('circuit.opened', (data) => {
      console.log(`⚡ Circuit opened, pausing recovery for ${data.circuitId}`);
      this.pauseRecovery(data.circuitId);
    });

    eventBus.on('circuit.closed', (data) => {
      console.log(`⚡ Circuit closed, recovery successful for ${data.circuitId}`);
      this.markRecovered(data.circuitId);
    });

    // Start recovery loop
    this.startRecoveryLoop();
  }

  /**
   * Schedule recovery for a connection
   */
  scheduleRecovery(connectionId: string) {
    let strategy = this.strategies.get(connectionId);

    if (!strategy) {
      strategy = {
        id: connectionId,
        connectionId,
        attempts: 0,
        maxAttempts: 10,
        nextAttempt: new Date(Date.now() + 5000), // Start with 5s delay
        backoffMs: 5000,
        maxBackoffMs: 300000, // Max 5 minutes
        lastAttempt: null,
        status: 'active'
      };
      this.strategies.set(connectionId, strategy);
    } else if (strategy.status === 'paused' || strategy.status === 'recovered') {
      // Reactivate recovery
      strategy.status = 'active';
      strategy.nextAttempt = new Date(Date.now() + strategy.backoffMs);
    }

    console.log(`🔧 Scheduled recovery for ${connectionId} in ${strategy.backoffMs}ms`);
  }

  /**
   * Start automatic recovery loop
   */
  private startRecoveryLoop() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }

    this.recoveryInterval = setInterval(() => {
      if (this.enabled) {
        this.attemptRecoveries();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Attempt recovery for all scheduled connections
   */
  private async attemptRecoveries() {
    const now = Date.now();

    for (const [id, strategy] of this.strategies.entries()) {
      if (strategy.status !== 'active') continue;
      if (!strategy.nextAttempt || strategy.nextAttempt.getTime() > now) continue;
      if (strategy.attempts >= strategy.maxAttempts) {
        strategy.status = 'exhausted';
        console.error(`❌ Recovery exhausted for ${id} after ${strategy.maxAttempts} attempts`);
        eventBus.emit('recovery.exhausted', { connectionId: id });
        continue;
      }

      await this.attemptRecovery(strategy);
    }
  }

  /**
   * Attempt to recover a specific connection
   */
  private async attemptRecovery(strategy: RecoveryStrategy) {
    strategy.attempts++;
    strategy.lastAttempt = new Date();
    
    console.log(`🔧 Recovery attempt ${strategy.attempts}/${strategy.maxAttempts} for ${strategy.connectionId}`);

    try {
      // Use circuit breaker for recovery attempt
      const result = await circuitBreaker.execute(
        strategy.connectionId,
        async () => {
          return await connectionHealthService.checkConnection(strategy.connectionId);
        }
      );

      if (result.healthy) {
        strategy.status = 'recovered';
        console.log(`✅ Recovery successful for ${strategy.connectionId}`);
        eventBus.emit('recovery.success', { connectionId: strategy.connectionId });
        return;
      }
    } catch (error) {
      console.warn(`⚠️ Recovery attempt failed:`, error);
    }

    // Calculate next attempt with exponential backoff
    strategy.backoffMs = Math.min(
      strategy.backoffMs * 2,
      strategy.maxBackoffMs
    );
    strategy.nextAttempt = new Date(Date.now() + strategy.backoffMs);

    console.log(`🔧 Next recovery attempt in ${strategy.backoffMs}ms`);
  }

  /**
   * Pause recovery for a connection
   */
  pauseRecovery(connectionId: string) {
    const strategy = this.strategies.get(connectionId);
    if (strategy) {
      strategy.status = 'paused';
      console.log(`⏸️ Paused recovery for ${connectionId}`);
    }
  }

  /**
   * Resume recovery for a connection
   */
  resumeRecovery(connectionId: string) {
    const strategy = this.strategies.get(connectionId);
    if (strategy && strategy.status === 'paused') {
      strategy.status = 'active';
      strategy.nextAttempt = new Date(Date.now() + 5000);
      console.log(`▶️ Resumed recovery for ${connectionId}`);
    }
  }

  /**
   * Mark connection as recovered
   */
  private markRecovered(connectionId: string) {
    const strategy = this.strategies.get(connectionId);
    if (strategy) {
      strategy.status = 'recovered';
      strategy.attempts = 0;
      strategy.backoffMs = 5000;
    }
  }

  /**
   * Manually trigger recovery
   */
  async triggerRecovery(connectionId: string): Promise<boolean> {
    const strategy = this.strategies.get(connectionId);
    
    if (!strategy) {
      this.scheduleRecovery(connectionId);
      return false;
    }

    await this.attemptRecovery(strategy);
    return strategy.status === 'recovered';
  }

  /**
   * Get recovery status for a connection
   */
  getRecoveryStatus(connectionId: string): RecoveryStrategy | null {
    return this.strategies.get(connectionId) || null;
  }

  /**
   * Get all recovery strategies
   */
  getAllRecoveries(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Enable/disable automatic recovery
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`🔧 Automatic recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Reset recovery for a connection
   */
  reset(connectionId: string) {
    this.strategies.delete(connectionId);
    circuitBreaker.reset(connectionId);
    console.log(`🔧 Reset recovery strategy for ${connectionId}`);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    this.strategies.clear();
  }
}

// Export singleton instance
export const recoveryManager = new RecoveryManager();
