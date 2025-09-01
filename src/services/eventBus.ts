type EventCallback<T = any> = (data: T) => void;

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  subscribe<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit<T = any>(event: string, data?: T): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  unsubscribeAll(event: string): void {
    this.events.delete(event);
  }

  clear(): void {
    this.events.clear();
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Common event types
export const EVENTS = {
  // Trading events
  TRADE_EXECUTED: 'trade:executed',
  POSITION_OPENED: 'position:opened',
  POSITION_CLOSED: 'position:closed',
  MARKET_DATA_UPDATE: 'market:data-update',
  
  // Bot events
  BOT_STARTED: 'bot:started',
  BOT_STOPPED: 'bot:stopped',
  BOT_ERROR: 'bot:error',
  
  // User events
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  SETTINGS_UPDATED: 'settings:updated',
  
  // System events
  CONNECTION_STATUS: 'system:connection-status',
  ERROR_OCCURRED: 'system:error'
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];