// Central Service Lifecycle Manager - Prevents memory leaks and manages service coordination
import { logService } from './logging';
import { eventBus } from './eventBus';

interface ManagedService {
  name: string;
  instance: any;
  intervals: NodeJS.Timeout[];
  channels: any[];
  isRunning: boolean;
  cleanup?: () => Promise<void> | void;
}

class ServiceManager {
  private services: Map<string, ManagedService> = new Map();
  private globalIntervals: NodeJS.Timeout[] = [];
  private isShuttingDown = false;

  constructor() {
    // Handle page unload gracefully (browser equivalent of process termination)
    window.addEventListener('beforeunload', () => this.shutdown());
    window.addEventListener('unload', () => this.shutdown());
    
    // Handle unhandled errors (browser equivalent of uncaught exceptions)
    window.addEventListener('error', (event) => {
      logService.log('error', 'Uncaught exception, shutting down services', { error: event.error?.message || 'Unknown error' });
      this.shutdown();
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logService.log('error', 'Unhandled promise rejection, shutting down services', { error: event.reason?.message || 'Unknown rejection' });
      this.shutdown();
    });
  }

  // Register a service with the manager
  registerService(name: string, instance: any, cleanup?: () => Promise<void> | void): void {
    const service: ManagedService = {
      name,
      instance,
      intervals: [],
      channels: [],
      isRunning: false,
      cleanup
    };

    this.services.set(name, service);
    logService.log('info', `Service registered: ${name}`);
  }

  // Create and track intervals
  createInterval(serviceName: string, callback: () => void, ms: number): NodeJS.Timeout {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const interval = setInterval(() => {
      if (!this.isShuttingDown && service.isRunning) {
        try {
          callback();
        } catch (error) {
          logService.log('error', `Interval error in ${serviceName}`, { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }, ms);

    service.intervals.push(interval);
    return interval;
  }

  // Create and track global intervals
  createGlobalInterval(callback: () => void, ms: number): NodeJS.Timeout {
    const interval = setInterval(() => {
      if (!this.isShuttingDown) {
        try {
          callback();
        } catch (error) {
          logService.log('error', 'Global interval error', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }, ms);

    this.globalIntervals.push(interval);
    return interval;
  }

  // Start a service
  startService(name: string): void {
    const service = this.services.get(name);
    if (service) {
      service.isRunning = true;
      logService.log('info', `Service started: ${name}`);
    }
  }

  // Stop a service
  stopService(name: string): void {
    const service = this.services.get(name);
    if (service) {
      service.isRunning = false;
      
      // Clear all intervals for this service
      service.intervals.forEach(interval => clearInterval(interval));
      service.intervals = [];
      
      // Clean up channels
      service.channels.forEach(channel => {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      });
      service.channels = [];
      
      logService.log('info', `Service stopped: ${name}`);
    }
  }

  // Check if a service is running
  isServiceRunning(name: string): boolean {
    const service = this.services.get(name);
    return service ? service.isRunning : false;
  }

  // Get service health status
  getServiceHealth(): Record<string, { running: boolean; intervals: number; channels: number }> {
    const health: Record<string, any> = {};
    
    this.services.forEach((service, name) => {
      health[name] = {
        running: service.isRunning,
        intervals: service.intervals.length,
        channels: service.channels.length
      };
    });

    return health;
  }

  // Shutdown all services gracefully
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logService.log('info', 'Service Manager: Initiating graceful shutdown');

    // Stop all services
    for (const [name] of this.services) {
      this.stopService(name);
    }

    // Run custom cleanup functions
    for (const [name, service] of this.services) {
      if (service.cleanup) {
        try {
          await service.cleanup();
          logService.log('info', `Service cleanup completed: ${name}`);
        } catch (error) {
          logService.log('error', `Service cleanup failed: ${name}`, { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    // Clear global intervals
    this.globalIntervals.forEach(interval => clearInterval(interval));
    this.globalIntervals = [];

    // Emit shutdown event
    eventBus.emit('system.shutdown', { timestamp: new Date() });
    
    logService.log('info', 'Service Manager: Shutdown complete');
  }

  // Get system metrics
  getSystemMetrics() {
    return {
      servicesRegistered: this.services.size,
      servicesRunning: Array.from(this.services.values()).filter(s => s.isRunning).length,
      totalIntervals: Array.from(this.services.values()).reduce((sum, s) => sum + s.intervals.length, 0) + this.globalIntervals.length,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();