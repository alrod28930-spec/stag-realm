import { create } from 'zustand';
import { BrokerAdapter, FakeBrokerAdapter, PortfolioSummary, TradeOrder, TradeResult } from '@/adapters/BrokerAdapter';
import { logService } from '@/services/logging';
import { eventBus } from '@/services/eventBus';
import { serviceManager } from '@/services/serviceManager';

interface PortfolioState {
  // Broker Connection
  brokerAdapter: BrokerAdapter;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Portfolio Data
  portfolio: PortfolioSummary | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  
  // Trading
  pendingOrders: TradeResult[];
  tradeHistory: TradeResult[];
  
  // Actions
  connectBroker: (apiKey: string, brokerType?: string) => Promise<boolean>;
  disconnectBroker: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  executeTrade: (order: TradeOrder) => Promise<TradeResult>;
  clearError: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  // Initial State
  brokerAdapter: new FakeBrokerAdapter(),
  isConnected: false,
  connectionStatus: 'disconnected',
  portfolio: null,
  lastUpdated: null,
  isLoading: false,
  error: null,
  pendingOrders: [],
  tradeHistory: [],

  // Connect to Broker
  connectBroker: async (apiKey: string, brokerType: string = 'fake') => {
    const state = get();
    
    set({ 
      connectionStatus: 'connecting', 
      error: null 
    });

    try {
      // For now, always use fake adapter
      // Future: switch based on brokerType
      const adapter = new FakeBrokerAdapter();
      
      const success = await adapter.connect(apiKey);
      
      if (success) {
        set({
          brokerAdapter: adapter,
          isConnected: true,
          connectionStatus: 'connected'
        });

        // Auto-refresh portfolio on connection
        await get().refreshPortfolio();
        
        eventBus.emit('broker.connected' as any, { brokerType, apiKey: apiKey.slice(0, 8) + '...' });
        logService.log('info', 'Broker connected successfully', { brokerType });
        
        return true;
      } else {
        throw new Error('Failed to connect to broker');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      
      set({
        connectionStatus: 'error',
        error: errorMessage,
        isConnected: false
      });
      
      logService.log('error', 'Broker connection failed', { error: errorMessage, brokerType });
      eventBus.emit('broker.connection_failed' as any, { error: errorMessage, brokerType });
      
      return false;
    }
  },

  // Disconnect from Broker
  disconnectBroker: async () => {
    const { brokerAdapter } = get();
    
    try {
      await brokerAdapter?.disconnect();
      
      set({
        isConnected: false,
        connectionStatus: 'disconnected',
        portfolio: null,
        lastUpdated: null,
        error: null,
        pendingOrders: [],
        brokerAdapter: new FakeBrokerAdapter()
      });
      
      eventBus.emit('broker.disconnected' as any, {});
      logService.log('info', 'Broker disconnected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnection error';
      logService.log('error', 'Broker disconnection failed', { error: errorMessage });
    }
  },

  // Refresh Portfolio Data
  refreshPortfolio: async () => {
    const { brokerAdapter, isConnected } = get();
    
    if (!isConnected) return;
    
    set({ isLoading: true, error: null });
    
    try {
      const portfolio = await brokerAdapter.fetchPortfolio();
      
      set({
        portfolio,
        lastUpdated: new Date(),
        isLoading: false
      });
      
      eventBus.emit('portfolio.updated' as any, portfolio);
      logService.log('info', 'Portfolio refreshed', { 
        totalValue: portfolio.totalValue,
        positions: portfolio.positions.length 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh portfolio';
      
      set({
        error: errorMessage,
        isLoading: false
      });
      
      logService.log('error', 'Portfolio refresh failed', { error: errorMessage });
      eventBus.emit('portfolio.error' as any, { error: errorMessage });
    }
  },

  // Execute Trade
  executeTrade: async (order: TradeOrder) => {
    const { brokerAdapter, isConnected, tradeHistory } = get();
    
    if (!isConnected) {
      throw new Error('Not connected to broker');
    }
    
    try {
      const result = await brokerAdapter.placeTrade(order);
      
      // Add to trade history
      const newHistory = [result, ...tradeHistory].slice(0, 100); // Keep last 100 trades
      
      set({ 
        tradeHistory: newHistory,
        pendingOrders: result.status === 'pending' 
          ? [...get().pendingOrders, result]
          : get().pendingOrders
      });
      
      // Refresh portfolio after successful trade
      if (result.status === 'filled') {
        setTimeout(() => get().refreshPortfolio(), 1000);
      }
      
      eventBus.emit('trade-executed', result);
      logService.log('info', 'Trade executed', result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Trade execution failed';
      logService.log('error', 'Trade execution failed', { error: errorMessage, order });
      eventBus.emit('trade-failed', { error: errorMessage, order });
      throw error;
    }
  },

  // Clear Error
  clearError: () => {
    set({ error: null });
  }
}));

// Auto-refresh portfolio every 30 seconds when connected - managed by service manager
serviceManager.registerService('portfolioStore', usePortfolioStore, () => {
  // Cleanup handled by service manager
});

serviceManager.createGlobalInterval(async () => {
  const { isConnected, refreshPortfolio } = usePortfolioStore.getState();
  if (isConnected) {
    await refreshPortfolio();
  }
}, 30000);

serviceManager.startService('portfolioStore');