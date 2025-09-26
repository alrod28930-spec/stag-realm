import { useEffect, useState, useCallback } from 'react';
import { eventBus } from '@/services/eventBus';
import { systemCoordinator } from '@/services/systemCoordinator';

/**
 * Hook for components to participate in the system-wide nervous system
 */
export function useSystemCoordination() {
  const [systemHealth, setSystemHealth] = useState(systemCoordinator.getSystemHealth());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Subscribe to system-wide coordination events
    const cleanup: Array<() => void> = [];

    // System state synchronization
    const syncHandler = (data: any) => {
      setSystemHealth(systemCoordinator.getSystemHealth());
    };
    eventBus.on('system.state_sync', syncHandler);
    cleanup.push(() => eventBus.off('system.state_sync', syncHandler));

    // Connection status monitoring
    const connectedHandler = () => setIsConnected(true);
    eventBus.on('broker.connected', connectedHandler);
    cleanup.push(() => eventBus.off('broker.connected', connectedHandler));

    const disconnectedHandler = () => setIsConnected(false);
    eventBus.on('broker.disconnected', disconnectedHandler);
    cleanup.push(() => eventBus.off('broker.disconnected', disconnectedHandler));

    // Error handling
    const errorHandler = (error: any) => {
      console.error('System error detected:', error);
    };
    eventBus.on('system.error', errorHandler);
    cleanup.push(() => eventBus.off('system.error', errorHandler));

    return () => {
      cleanup.forEach(unsub => unsub());
    };
  }, []);

  // Emit events to the system
  const emitSystemEvent = useCallback((eventName: string, data: any) => {
    systemCoordinator.emitSystemEvent(eventName, data);
  }, []);

  // Subscribe to specific events
  const subscribeToEvent = useCallback((eventName: string, callback: (data: any) => void) => {
    return eventBus.on(eventName as any, callback);
  }, []);

  // Trigger global refresh
  const triggerGlobalRefresh = useCallback(() => {
    eventBus.emit('ui.global_refresh', {});
  }, []);

  return {
    systemHealth,
    isConnected,
    emitSystemEvent,
    subscribeToEvent,
    triggerGlobalRefresh,
    eventHistory: systemCoordinator.getEventHistory(20)
  };
}

/**
 * Hook for portfolio-specific coordination
 */
export function usePortfolioCoordination() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const cleanup: Array<() => void> = [];

    const portfolioHandler = () => {
      setLastUpdate(new Date());
      setIsRefreshing(false);
    };
    eventBus.on('portfolio.updated', portfolioHandler);
    cleanup.push(() => eventBus.off('portfolio.updated', portfolioHandler));
    
    const refreshHandler = () => {
      setIsRefreshing(true);
    };
    eventBus.on('portfolio.refresh_request', refreshHandler);
    cleanup.push(() => eventBus.off('portfolio.refresh_request', refreshHandler));

    const tradeHandler = () => {
      // Portfolio will update shortly after trade
      setIsRefreshing(true);
    };
    eventBus.on('trade.executed', tradeHandler);
    cleanup.push(() => eventBus.off('trade.executed', tradeHandler));

    return () => cleanup.forEach(unsub => unsub());
  }, []);

  const requestPortfolioRefresh = useCallback(() => {
    eventBus.emit('portfolio.refresh_request', { source: 'manual' });
  }, []);

  return {
    lastUpdate,
    isRefreshing,
    requestPortfolioRefresh
  };
}

/**
 * Hook for trading coordination
 */
export function useTradingCoordination() {
  const [lastTrade, setLastTrade] = useState<any>(null);
  const [riskMode, setRiskMode] = useState<'normal' | 'cautious' | 'emergency'>('normal');

  useEffect(() => {
    const cleanup: Array<() => void> = [];

    const tradeHandler = (trade: any) => {
      setLastTrade(trade);
    };
    eventBus.on('trade.executed', tradeHandler);
    cleanup.push(() => eventBus.off('trade.executed', tradeHandler));

    const softPullHandler = () => {
      setRiskMode('cautious');
    };
    eventBus.on('risk.soft_pull', softPullHandler);
    cleanup.push(() => eventBus.off('risk.soft_pull', softPullHandler));

    const hardPullHandler = () => {
      setRiskMode('emergency');
    };
    eventBus.on('risk.hard_pull', hardPullHandler);
    cleanup.push(() => eventBus.off('risk.hard_pull', hardPullHandler));

    const clearHandler = () => {
      setRiskMode('normal');
    };
    eventBus.on('risk.mode_cleared', clearHandler);
    cleanup.push(() => eventBus.off('risk.mode_cleared', clearHandler));

    return () => cleanup.forEach(unsub => unsub());
  }, []);

  const executeTrade = useCallback((tradeData: any) => {
    eventBus.emit('trade.intent', tradeData);
  }, []);

  return {
    lastTrade,
    riskMode,
    executeTrade
  };
}