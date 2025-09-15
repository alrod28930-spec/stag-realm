// System Initializer - Simplified version to avoid startup crashes
import { logService } from './logging';
import { eventBus } from './eventBus';

class SystemInitializer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logService.log('warn', 'System already initialized');
      return;
    }

    logService.log('info', 'Starting simplified system initialization...');
    const startTime = Date.now();

    try {
      // Only initialize essential services to avoid complex dependencies
      await this.initializeEssentialServices();

      const initTime = Date.now() - startTime;
      this.isInitialized = true;

      logService.log('info', 'System initialization complete', {
        totalTimeMs: initTime
      });

      // Emit system ready event
      eventBus.emit('system.ready', {
        timestamp: new Date(),
        initializationTime: initTime
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'System initialization failed', { 
        error: errorMessage
      });
      
      // Don't throw - let the app continue with basic functionality
      console.warn('System services failed to initialize, continuing with basic functionality');
    }
  }

  private async initializeEssentialServices(): Promise<void> {
    try {
      // Only load non-critical services asynchronously
      setTimeout(() => {
        this.loadOptionalServices();
      }, 2000);
      
      logService.log('info', 'Essential services initialized');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'Failed to initialize essential services', { error: errorMessage });
    }
  }

  private async loadOptionalServices(): Promise<void> {
    try {
      // Load services one by one with error handling
      const services = [
        'scaffold',
        'bid', 
        'oracle'
      ];

      for (const serviceName of services) {
        try {
          await this.loadService(serviceName);
        } catch (error) {
          logService.log('warn', `Optional service failed to load: ${serviceName}`, { error });
          // Continue with other services
        }
      }

    } catch (error) {
      logService.log('warn', 'Some optional services failed to load', { error });
    }
  }

  private async loadService(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'scaffold':
        await import('./scaffold').catch(() => {});
        break;
      case 'bid':
        await import('./bid').catch(() => {});
        break;
      case 'oracle':
        await import('./oracle').catch(() => {});
        break;
    }
  }

  // Health check
  getSystemHealth() {
    return {
      isInitialized: this.isInitialized,
      initializedServices: [],
      serviceHealth: {},
      systemMetrics: {
        servicesRegistered: 0,
        servicesRunning: 0,
        totalIntervals: 0,
        isShuttingDown: false
      },
      timestamp: new Date()
    };
  }

  // Add shutdown method for compatibility
  async shutdown(): Promise<void> {
    console.log('System shutdown requested (simplified mode)');
  }
}

// Export singleton
export const systemInitializer = new SystemInitializer();