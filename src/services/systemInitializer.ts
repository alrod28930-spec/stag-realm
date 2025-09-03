// System Initializer - Coordinates startup of all services in proper order
import { serviceManager } from './serviceManager';
import { logService } from './logging';
import { eventBus } from './eventBus';

class SystemInitializer {
  private initializationOrder = [
    'serviceManager',
    'eventBus', 
    'logging',
    'scaffold',
    'bidCore',
    'oracle',
    'learningEngine',
    'overseer',
    'storageManager',
    'portfolioStore'
  ];

  private initializedServices: Set<string> = new Set();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logService.log('warn', 'System already initialized');
      return;
    }

    logService.log('info', 'Starting system initialization...');
    const startTime = Date.now();

    try {
      // Import and initialize each service in order
      for (const serviceName of this.initializationOrder) {
        await this.initializeService(serviceName);
        this.initializedServices.add(serviceName);
      }

      // Wait a moment for all services to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      const initTime = Date.now() - startTime;
      this.isInitialized = true;

      logService.log('info', 'System initialization complete', {
        totalTimeMs: initTime,
        servicesInitialized: this.initializedServices.size
      });

      // Emit system ready event
      eventBus.emit('system.ready', {
        timestamp: new Date(),
        initializationTime: initTime,
        services: Array.from(this.initializedServices)
      });

      // Show service manager status
      this.showSystemStatus();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'System initialization failed', { 
        error: errorMessage,
        initializedServices: Array.from(this.initializedServices)
      });
      
      throw new Error(`System initialization failed: ${errorMessage}`);
    }
  }

  private async initializeService(serviceName: string): Promise<void> {
    logService.log('info', `Initializing service: ${serviceName}`);
    
    try {
      switch (serviceName) {
        case 'serviceManager':
          // Service manager is already initialized
          break;
          
        case 'eventBus':
          // Event bus is already initialized
          break;
          
        case 'logging':
          // Logging is already initialized
          break;
          
        case 'scaffold':
          await import('./scaffold');
          break;
          
        case 'bidCore':
          await import('./bidCore');
          break;
          
        case 'oracle':
          await import('./oracle');
          break;
          
        case 'learningEngine':
          await import('./learningEngine');
          break;
          
        case 'overseer':
          await import('./overseer');
          break;
          
        case 'storageManager':
          await import('./storageManager');
          break;
          
        case 'portfolioStore':
          await import('@/stores/portfolioStore');
          break;
          
        default:
          logService.log('warn', `Unknown service: ${serviceName}`);
      }
      
      logService.log('info', `Service initialized: ${serviceName}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', `Failed to initialize service: ${serviceName}`, { error: errorMessage });
      throw error;
    }
  }

  private showSystemStatus(): void {
    const serviceHealth = serviceManager.getServiceHealth();
    const systemMetrics = serviceManager.getSystemMetrics();

    logService.log('info', 'System Status Report', {
      services: serviceHealth,
      metrics: systemMetrics,
      ready: true
    });

    console.log('\n🚀 StagAlgo System Status:');
    console.log('═══════════════════════════════════════');
    
    Object.entries(serviceHealth).forEach(([name, status]) => {
      const icon = status.running ? '✓' : '✗';
      const color = status.running ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${icon}${reset} ${name.padEnd(15)} - Running: ${status.running}, Intervals: ${status.intervals}`);
    });
    
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total Services: ${systemMetrics.servicesRegistered}`);
    console.log(`🔄 Running Services: ${systemMetrics.servicesRunning}`);
    console.log(`⏱️  Active Intervals: ${systemMetrics.totalIntervals}`);
    console.log('═══════════════════════════════════════\n');
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    logService.log('info', 'Initiating system shutdown...');
    
    try {
      await serviceManager.shutdown();
      this.isInitialized = false;
      this.initializedServices.clear();
      
      logService.log('info', 'System shutdown complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logService.log('error', 'System shutdown error', { error: errorMessage });
    }
  }

  // Health check
  getSystemHealth() {
    return {
      isInitialized: this.isInitialized,
      initializedServices: Array.from(this.initializedServices),
      serviceHealth: serviceManager.getServiceHealth(),
      systemMetrics: serviceManager.getSystemMetrics()
    };
  }
}

// Export singleton
export const systemInitializer = new SystemInitializer();