import { eventBus } from './eventBus';
import { coreScaffold } from './scaffold';
import { serviceManager } from './serviceManager';
import { logService } from './logging';

/**
 * SystemCoordinator - Enhanced nervous system for cross-app coordination
 * Ensures decisions and actions propagate throughout the entire application
 */
export class SystemCoordinator {
  private activeConnections = new Set<string>();
  private eventHistory: Array<{ timestamp: Date; event: string; data: any }> = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initializeNervousSystem();
  }

  private initializeNervousSystem() {
    // Cross-system event coordination
    this.setupPortfolioCoordination();
    this.setupTradingCoordination();
    this.setupRiskCoordination();
    this.setupAnalyticsCoordination();
    this.setupUICoordination();
    
    logService.log('info', 'SystemCoordinator: Nervous system initialized');
  }

  private setupPortfolioCoordination() {
    // Portfolio changes trigger cascading updates
    eventBus.on('portfolio.updated', (data) => {
      this.recordEvent('portfolio.updated', data);
      
      // Propagate to all dependent systems
      eventBus.emit('analytics.portfolio_changed', data);
      eventBus.emit('risk.portfolio_changed', data);
      eventBus.emit('ui.portfolio_refresh', data);
      eventBus.emit('bots.portfolio_changed', data);
    });

    // Position changes coordinate across systems
    eventBus.on('positions.updated', (data) => {
      this.recordEvent('positions.updated', data);
      
      eventBus.emit('charts.positions_changed', data);
      eventBus.emit('analytics.positions_changed', data);
      eventBus.emit('ui.positions_refresh', data);
    });
  }

  private setupTradingCoordination() {
    // Trade execution cascades through all systems
    eventBus.on('trade.executed', (data) => {
      this.recordEvent('trade.executed', data);
      
      // Immediate propagation
      eventBus.emit('portfolio.trade_executed', data);
      eventBus.emit('analytics.trade_executed', data);
      eventBus.emit('risk.trade_executed', data);
      eventBus.emit('ui.trade_notification', data);
      eventBus.emit('bots.trade_executed', data);
      
      // Trigger portfolio refresh after brief delay
      setTimeout(() => {
        eventBus.emit('portfolio.refresh_request', { reason: 'trade_executed' });
      }, 2000);
    });

    // Order status changes coordinate updates
    eventBus.on('order.status_changed', (data) => {
      this.recordEvent('order.status_changed', data);
      
      eventBus.emit('ui.order_status_changed', data);
      eventBus.emit('analytics.order_status_changed', data);
    });
  }

  private setupRiskCoordination() {
    // Risk events trigger immediate system-wide responses
    eventBus.on('risk.soft_pull', (data) => {
      this.recordEvent('risk.soft_pull', data);
      
      eventBus.emit('bots.risk_mode_changed', { mode: 'cautious', data });
      eventBus.emit('ui.risk_warning', { level: 'soft', data });
      eventBus.emit('analytics.risk_event', { type: 'soft_pull', data });
    });

    eventBus.on('risk.hard_pull', (data) => {
      this.recordEvent('risk.hard_pull', data);
      
      eventBus.emit('bots.emergency_stop', data);
      eventBus.emit('ui.emergency_notification', { type: 'hard_pull', data });
      eventBus.emit('analytics.risk_event', { type: 'hard_pull', data });
    });
  }

  private setupAnalyticsCoordination() {
    // Oracle signals cascade through decision systems
    eventBus.on('oracle.signal.created', (data) => {
      this.recordEvent('oracle.signal.created', data);
      
      eventBus.emit('bots.oracle_signal', data);
      eventBus.emit('analytics.oracle_signal', data);
      eventBus.emit('ui.oracle_signal', data);
      eventBus.emit('charts.oracle_signal', data);
    });

    // Market data updates trigger coordinated responses
    eventBus.on('market.data.updated', (data) => {
      this.recordEvent('market.data.updated', data);
      
      eventBus.emit('charts.market_data_updated', data);
      eventBus.emit('oracle.market_data_updated', data);
      eventBus.emit('analytics.market_data_updated', data);
    });
  }

  private setupUICoordination() {
    // UI refresh coordination
    eventBus.on('ui.global_refresh', () => {
      this.recordEvent('ui.global_refresh', {});
      
      eventBus.emit('portfolio.refresh_request', { source: 'ui' });
      eventBus.emit('charts.refresh_request', { source: 'ui' });
      eventBus.emit('analytics.refresh_request', { source: 'ui' });
    });

    // Error coordination
    eventBus.on('system.error', (data) => {
      this.recordEvent('system.error', data);
      
      eventBus.emit('ui.error_notification', data);
      eventBus.emit('analytics.error_logged', data);
    });
  }

  // State synchronization across components
  syncSystemState() {
    const systemState = coreScaffold.getSystemState();
    const logicState = coreScaffold.getLogicLayerState();
    
    eventBus.emit('system.state_sync', {
      system: systemState,
      logic: logicState,
      timestamp: new Date()
    });
  }

  // Cross-tab communication
  setupCrossTabCommunication() {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('stag-system-coordination');
      
      channel.onmessage = (event) => {
        if (event.data.type === 'system_event') {
          eventBus.emit(event.data.eventName, event.data.data);
        }
      };

      // Broadcast important events to other tabs
      const broadcastEvents = [
        'trade.executed',
        'portfolio.updated',
        'risk.soft_pull',
        'risk.hard_pull',
        'broker.connected',
        'broker.disconnected'
      ];

      broadcastEvents.forEach(eventName => {
        eventBus.on(eventName as any, (data) => {
          channel.postMessage({
            type: 'system_event',
            eventName,
            data,
            timestamp: new Date().toISOString()
          });
        });
      });
    }
  }

  private recordEvent(event: string, data: any) {
    this.eventHistory.unshift({
      timestamp: new Date(),
      event,
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    });

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  // Health monitoring
  getSystemHealth() {
    const recentEvents = this.eventHistory.slice(0, 50);
    const eventCounts = recentEvents.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalConnections: this.activeConnections.size,
      recentEventActivity: eventCounts,
      systemState: coreScaffold.getSystemState(),
      serviceStatus: serviceManager.getSystemMetrics(),
      lastActivity: this.eventHistory[0]?.timestamp || new Date()
    };
  }

  // Event replay for debugging
  getEventHistory(limit = 100) {
    return this.eventHistory.slice(0, limit);
  }

  // Manual event emission for testing
  emitSystemEvent(eventName: string, data: any) {
    eventBus.emit(eventName as any, data);
    this.recordEvent(`manual.${eventName}`, data);
  }
}

export const systemCoordinator = new SystemCoordinator();

// Initialize cross-tab communication
systemCoordinator.setupCrossTabCommunication();

// Regular system state synchronization
setInterval(() => {
  systemCoordinator.syncSystemState();
}, 30000);

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__systemCoordinator = systemCoordinator;
}