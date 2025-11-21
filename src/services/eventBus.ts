type EventMap = {
  // Broker events
  'broker.connected': { brokerType: string; apiKey: string };
  'broker.disconnected': { reason?: string };
  'broker.connection_failed': { error: string; brokerType: string };
  
  // Portfolio events
  'portfolio.updated': any;
  'portfolio.error': { error: string };

  // Migration events
  'migration.started': { migrationId: string; workspaceId?: string };
  'migration.completed': { migrationId: string; workspaceId?: string; result: any };
  'migration.failed': { migrationId: string; workspaceId?: string; result: any };
  'migration.queued': { queueItem: any };

  // Connection health events
  'connection.error': { 
    connectionId: string; 
    type: string; 
    name: string; 
    error?: string; 
    errorCount: number 
  };

  // Circuit breaker events
  'circuit.opened': { circuitId: string; reason: string; failures?: number };
  'circuit.closed': { circuitId: string };
  'circuit.reset': { circuitId: string };

  // Recovery events
  'recovery.exhausted': { connectionId: string };
  'recovery.success': { connectionId: string };

  // Queue events
  'queue.paused': {};
  'queue.completed': {};

  // Pool events
  'pool.initialized': { poolId: string; config: any };
  'pool.connection_acquired': { poolId: string; connectionId: string };
  'pool.connection_released': { poolId: string; connectionId: string };
  'pool.shutdown': { poolId: string };

  // Lifecycle events
  'lifecycle.registered': { connectionId: string };
  'lifecycle.connected': { connectionId: string; previousState: string };
  'lifecycle.reconnecting': { connectionId: string; attempt: number; delay: number };
  'lifecycle.failed': { connectionId: string };
  
  // Repository events
  'repository.snapshot_cleaned': any;
  'repository.market_data_cleaned': any[];
  'repository.csv_imported': any;
  
  // BID events
  'bid.portfolio_updated': any;
  'bid.risk_metrics_updated': any;
  'bid.alerts_generated': any[];
  'bid.alert_acknowledged': any;
  'bid.strategy_signal_added': any;
  'bid.feature_flag_updated': { feature: string; enabled: boolean };
  'bid.market_sentiment_updated': any;
  
  // Trade events
  'trade.intent': any;
  'trade.governance_decision': any;
  'trade.executed': any;
  'trade.failed': { error: string; order: any };
  
  // Risk/Governance events
  'risk.soft_pull': { reason: string; affectedSymbols: string[] };
  'risk.hard_pull': { reason: string; affectedSymbols: string[] };
  'monarch.status_changed': { active: boolean };
  'monarch.risk_limits_updated': any;
  'monarch.symbol_blacklisted': { symbol: string; reason: string };
  'monarch.symbol_unblacklisted': { symbol: string };
  'overseer.status_changed': { active: boolean };
  'overseer.emergency_mode_cleared': {};
  
  // Analyst events
  'analyst.conversation': any;
  'analyst.emergency_notification': { type: string; reason: string; timestamp: Date };
  'analyst.voice_interaction': { transcription: string; response: string; personality: string; timestamp: string };
  'analyst.cache_hit': { key: string; hits: number };
  'analyst.note': { sessionId: string; userQuery: string; response: string; persona: string; knowledgeBaseSources: string[] };
  'analyst.retry': { message: string };
  'analyst.cache.stats': {};
  
  // Recorder events
  'recorder.exported': any;
  
  // Generic events
  [key: string]: any;
};

export class EventBus {
  private listeners = new Map<string, Array<(data: any) => void>>();

  // Subscribe to events
  on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, []);
    }
    this.listeners.get(event as string)!.push(callback);
  }

  // Emit events
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const eventListeners = this.listeners.get(event as string);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  // Unsubscribe from events  
  off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
    const eventListeners = this.listeners.get(event as string);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Legacy subscribe method for compatibility
  subscribe<T = any>(event: string, callback: (data?: T) => void): () => void {
    this.on(event as keyof EventMap, callback);
    return () => this.off(event as keyof EventMap, callback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Global event bus instance
export const eventBus = new EventBus();