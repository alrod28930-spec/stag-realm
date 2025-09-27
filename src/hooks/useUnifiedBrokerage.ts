import { useState, useEffect, useCallback } from 'react';
import { unifiedBrokerageService } from '@/services/unifiedBrokerageService';
import { eventBus } from '@/services/eventBus';
import { useToast } from '@/hooks/use-toast';

interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  source: 'manual' | 'bot';
  botId?: string;
}

interface Portfolio {
  cash: number;
  equity: number;
  dayTradeCount: number;
  positions: Array<{
    symbol: string;
    qty: number;
    avg_cost: number;
    mv: number;
    unr_pnl: number;
    r_pnl: number;
  }>;
}

export const useUnifiedBrokerage = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Initialize service and load data
  useEffect(() => {
    const initializeService = async () => {
      setIsLoading(true);
      await unifiedBrokerageService.initialize();
      
      // Load initial state
      const status = unifiedBrokerageService.getConnectionStatus();
      setIsConnected(status.isConnected);
      setConnections(status.connections);
      setLastSync(status.lastSync);
      
      const currentPortfolio = unifiedBrokerageService.getPortfolio();
      setPortfolio(currentPortfolio);
      
      setIsLoading(false);
    };

    initializeService();

    // Cleanup on unmount
    return () => {
      unifiedBrokerageService.shutdown();
    };
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    const handlePortfolioLoaded = (data: any) => {
      setPortfolio(data.portfolio);
      setLastSync(new Date());
    };

    const handlePortfolioSynced = (data: any) => {
      setLastSync(new Date());
      if (data.success) {
        toast({
          title: "Portfolio Synced",
          description: `${data.connectionsProcessed} connections processed`,
        });
      }
    };

    const handleTradeExecuted = (data: any) => {
      toast({
        title: "Trade Executed",
        description: `${data.side.toUpperCase()} ${data.quantity} ${data.symbol}`,
      });
      
      // Portfolio will auto-update via sync
    };

    const handleBrokerageInitialized = (data: any) => {
      const status = unifiedBrokerageService.getConnectionStatus();
      setIsConnected(status.isConnected);
      setConnections(status.connections);
    };

    // Subscribe to events
    eventBus.on('portfolio.loaded', handlePortfolioLoaded);
    eventBus.on('portfolio.synced', handlePortfolioSynced);
    eventBus.on('trade.executed', handleTradeExecuted);
    eventBus.on('brokerage.initialized', handleBrokerageInitialized);

    return () => {
      eventBus.off('portfolio.loaded', handlePortfolioLoaded);
      eventBus.off('portfolio.synced', handlePortfolioSynced);
      eventBus.off('trade.executed', handleTradeExecuted);
      eventBus.off('brokerage.initialized', handleBrokerageInitialized);
    };
  }, [toast]);

  // Execute trade
  const executeTrade = useCallback(async (request: TradeRequest) => {
    setIsLoading(true);
    try {
      const result = await unifiedBrokerageService.executeTrade(request);
      
      if (result.success) {
        toast({
          title: "Trade Submitted",
          description: result.message,
        });
      } else {
        toast({
          title: "Trade Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error: any) {
      toast({
        title: "Trade Error",
        description: error.message || 'Unknown error occurred',
        variant: "destructive"
      });
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await unifiedBrokerageService.refresh();
      
      if (result.success) {
        toast({
          title: "Portfolio Refreshed",
          description: result.message,
        });
      } else {
        toast({
          title: "Refresh Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error: any) {
      toast({
        title: "Refresh Error",
        description: error.message || 'Failed to refresh portfolio',
        variant: "destructive"
      });
      return {
        success: false,
        message: error.message || 'Failed to refresh portfolio'
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    // State
    portfolio,
    isConnected,
    isLoading,
    lastSync,
    connections,
    
    // Actions
    executeTrade,
    refresh,
    
    // Computed values
    totalValue: portfolio?.equity || 0,
    availableCash: portfolio?.cash || 0,
    positionsCount: portfolio?.positions?.length || 0,
    unrealizedPnL: portfolio?.positions?.reduce((sum, pos) => sum + pos.unr_pnl, 0) || 0,
    realizedPnL: portfolio?.positions?.reduce((sum, pos) => sum + pos.r_pnl, 0) || 0,
  };
};