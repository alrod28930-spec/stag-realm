/**
 * Service Cleanup Utilities - Prevent Memory Leaks
 * Provides centralized cleanup for intervals, timeouts, and event listeners
 */

class ServiceCleanupManager {
  private intervals = new Map<string, NodeJS.Timeout[]>();
  private timeouts = new Map<string, NodeJS.Timeout[]>();
  private eventListeners = new Map<string, Array<{ element: EventTarget; event: string; handler: EventListener }>>(); 
  private isShuttingDown = false;

  /**
   * Register an interval for a service
   */
  addInterval(serviceId: string, interval: NodeJS.Timeout): void {
    if (!this.intervals.has(serviceId)) {
      this.intervals.set(serviceId, []);
    }
    this.intervals.get(serviceId)!.push(interval);
  }

  /**
   * Register a timeout for a service  
   */
  addTimeout(serviceId: string, timeout: NodeJS.Timeout): void {
    if (!this.timeouts.has(serviceId)) {
      this.timeouts.set(serviceId, []);
    }
    this.timeouts.get(serviceId)!.push(timeout);
  }

  /**
   * Register an event listener for a service
   */
  addEventListener(serviceId: string, element: EventTarget, event: string, handler: EventListener): void {
    if (!this.eventListeners.has(serviceId)) {
      this.eventListeners.set(serviceId, []);
    }
    this.eventListeners.get(serviceId)!.push({ element, event, handler });
    element.addEventListener(event, handler);
  }

  /**
   * Create a managed interval that auto-registers for cleanup
   */
  createInterval(serviceId: string, callback: () => void, ms: number): NodeJS.Timeout {
    const interval = setInterval(() => {
      if (!this.isShuttingDown) {
        try {
          callback();
        } catch (error) {
          console.error(`Interval error in ${serviceId}:`, error);
        }
      }
    }, ms);

    this.addInterval(serviceId, interval);
    return interval;
  }

  /**
   * Create a managed timeout that auto-registers for cleanup
   */
  createTimeout(serviceId: string, callback: () => void, ms: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      if (!this.isShuttingDown) {
        try {
          callback();
        } catch (error) {
          console.error(`Timeout error in ${serviceId}:`, error);
        }
      }
      // Remove from tracking once executed
      this.removeTimeout(serviceId, timeout);
    }, ms);

    this.addTimeout(serviceId, timeout);
    return timeout;
  }

  /**
   * Remove a specific timeout from tracking
   */
  private removeTimeout(serviceId: string, timeout: NodeJS.Timeout): void {
    const timeouts = this.timeouts.get(serviceId);
    if (timeouts) {
      const index = timeouts.indexOf(timeout);
      if (index > -1) {
        timeouts.splice(index, 1);
      }
    }
  }

  /**
   * Clean up all resources for a specific service
   */
  cleanupService(serviceId: string): void {
    // Clear intervals
    const intervals = this.intervals.get(serviceId);
    if (intervals) {
      intervals.forEach(interval => clearInterval(interval));
      this.intervals.delete(serviceId);
    }

    // Clear timeouts
    const timeouts = this.timeouts.get(serviceId);
    if (timeouts) {
      timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.delete(serviceId);
    }

    // Remove event listeners
    const listeners = this.eventListeners.get(serviceId);
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.eventListeners.delete(serviceId);
    }

    console.log(`✅ Cleaned up service: ${serviceId}`);
  }

  /**
   * Clean up all services (for app shutdown)
   */
  cleanupAll(): void {
    this.isShuttingDown = true;

    for (const serviceId of this.intervals.keys()) {
      this.cleanupService(serviceId);
    }

    console.log('✅ All services cleaned up');
  }

  /**
   * Get cleanup statistics
   */
  getStats(): Record<string, { intervals: number; timeouts: number; listeners: number }> {
    const stats: Record<string, any> = {};

    const allServices = new Set([
      ...this.intervals.keys(),
      ...this.timeouts.keys(), 
      ...this.eventListeners.keys()
    ]);

    for (const serviceId of allServices) {
      stats[serviceId] = {
        intervals: this.intervals.get(serviceId)?.length || 0,
        timeouts: this.timeouts.get(serviceId)?.length || 0,
        listeners: this.eventListeners.get(serviceId)?.length || 0
      };
    }

    return stats;
  }
}

export const serviceCleanupManager = new ServiceCleanupManager();

// Register cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    serviceCleanupManager.cleanupAll();
  });

  // Expose for debugging
  (window as any).__serviceCleanupManager = serviceCleanupManager;
}