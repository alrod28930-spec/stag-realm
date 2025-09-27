import { supabase } from '@/integrations/supabase/client';
import { eventBus } from './eventBus';
import { logService } from './logging';
import { getCurrentUserWorkspace } from '@/utils/auth';

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

interface BrokerageConnection {
  id: string;
  provider: string;
  status: 'active' | 'inactive';
  lastSync: Date | null;
  accountLabel?: string;
}

interface Portfolio {
  cash: number;
  equity: number;
  dayTradeCount: number;
  positions: Position[];
}

interface Position {
  symbol: string;
  qty: number;
  avg_cost: number;
  mv: number;
  unr_pnl: number;
  r_pnl: number;
}

/**
 * Unified Brokerage Service - Single point of access for all brokerage operations
 * Handles: Trading, Portfolio Sync, Real-time Updates, Data Mirroring
 */
export class UnifiedBrokerageService {
  private connections: BrokerageConnection[] = [];
  private portfolio: Portfolio | null = null;
  private isConnected = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize() {
    try {
      await this.loadConnections();
      await this.startAutoSync();
      
      eventBus.emit('brokerage.initialized', {
        connections: this.connections.length,
        timestamp: new Date()
      });
      
      logService.log('info', 'Unified Brokerage Service initialized', {
        connectionsCount: this.connections.length
      });
    } catch (error) {
      logService.log('error', 'Failed to initialize brokerage service', { error });
    }
  }

  /**
   * Load all active brokerage connections for the current workspace
   */
  private async loadConnections() {
    const workspaceId = await getCurrentUserWorkspace();
    if (!workspaceId) return;

    const { data: connections, error } = await supabase
      .from('connections_brokerages')
      .select('id, provider, status, last_sync, account_label')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    if (error) throw error;

    this.connections = connections?.map(conn => ({
      id: conn.id,
      provider: conn.provider,
      status: conn.status as 'active' | 'inactive',
      lastSync: conn.last_sync ? new Date(conn.last_sync) : null,
      accountLabel: conn.account_label
    })) || [];

    this.isConnected = this.connections.length > 0;
  }

  /**
   * Execute a trade through the unified system
   * Automatically handles: Risk checks, Execution, Portfolio sync, Event emission
   */
  async executeTrade(request: TradeRequest): Promise<{
    success: boolean;
    orderId?: string;
    message: string;
  }> {
    try {
      if (!this.isConnected) {
        return {
          success: false,
          message: 'No active brokerage connections found'
        };
      }

      // Execute trade via Supabase function
      const { data, error } = await supabase.functions.invoke('trade-execute', {
        body: {
          symbol: request.symbol,
          side: request.side,
          order_type: request.orderType,
          quantity: request.quantity,
          price: request.price,
          stop_price: request.stopPrice,
          stop_loss: request.stopLoss,
          take_profit: request.takeProfit
        }
      });

      if (error) throw error;

      if (data.success) {
        // Log the trade
        await this.logTradeExecution(request, data.order_id);
        
        // Immediate portfolio sync after trade
        await this.syncPortfolioData();
        
        // Emit trade executed event
        eventBus.emit('trade.executed', {
          orderId: data.order_id,
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          source: request.source,
          timestamp: new Date()
        });

        return {
          success: true,
          orderId: data.order_id,
          message: `Successfully ${request.side === 'buy' ? 'bought' : 'sold'} ${request.quantity} shares of ${request.symbol}`
        };
      } else {
        return {
          success: false,
          message: data.error || 'Trade execution failed'
        };
      }
    } catch (error: any) {
      logService.log('error', 'Trade execution failed', { error: error.message, request });
      return {
        success: false,
        message: error.message || 'Unexpected error during trade execution'
      };
    }
  }

  /**
   * Sync portfolio data from brokerage to local Supabase tables
   * This is the single source of truth for portfolio data
   */
  async syncPortfolioData(): Promise<{ success: boolean; message: string }> {
    try {
      const workspaceId = await getCurrentUserWorkspace();
      if (!workspaceId) {
        return { success: false, message: 'No workspace found' };
      }

      // Trigger brokerage sync
      const { data, error } = await supabase.functions.invoke('brokerage-sync', {
        body: { workspace_id: workspaceId }
      });

      if (error) throw error;

      // Update local state
      await this.loadPortfolioFromDatabase();
      
      // Emit sync completed event
      eventBus.emit('portfolio.synced', {
        success: data.success,
        connectionsProcessed: data.connections_processed,
        timestamp: new Date()
      });

      logService.log('info', 'Portfolio sync completed', {
        success: data.success,
        connections: data.connections_processed
      });

      return {
        success: true,
        message: `Portfolio synced successfully. ${data.connections_processed} connections processed.`
      };
    } catch (error: any) {
      logService.log('error', 'Portfolio sync failed', { error: error.message });
      return {
        success: false,
        message: error.message || 'Portfolio sync failed'
      };
    }
  }

  /**
   * Load current portfolio data from Supabase (after sync)
   */
  private async loadPortfolioFromDatabase() {
    const workspaceId = await getCurrentUserWorkspace();
    if (!workspaceId) return;

    try {
      // Load portfolio summary
      const { data: portfolioData } = await supabase
        .from('portfolio_current')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      // Load positions
      const { data: positionsData } = await supabase
        .from('positions_current')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('mv', { ascending: false });

      this.portfolio = portfolioData ? {
        cash: portfolioData.cash || 0,
        equity: portfolioData.equity || 0,
        dayTradeCount: 0, // Would need to add this field
        positions: positionsData || []
      } : null;

      // Emit portfolio loaded event
      eventBus.emit('portfolio.loaded', {
        portfolio: this.portfolio,
        timestamp: new Date()
      });

    } catch (error) {
      logService.log('error', 'Failed to load portfolio from database', { error });
    }
  }

  /**
   * Get current portfolio state
   */
  getPortfolio(): Portfolio | null {
    return this.portfolio;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      connections: this.connections,
      lastSync: this.connections.reduce((latest, conn) => {
        if (!conn.lastSync) return latest;
        return !latest || conn.lastSync > latest ? conn.lastSync : latest;
      }, null as Date | null)
    };
  }

  /**
   * Start automatic portfolio synchronization
   */
  private async startAutoSync() {
    // Initial sync
    await this.syncPortfolioData();
    await this.loadPortfolioFromDatabase();

    // Set up periodic sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      if (this.isConnected) {
        await this.syncPortfolioData();
      }
    }, 30000);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Log trade execution to recorder
   */
  private async logTradeExecution(request: TradeRequest, orderId: string) {
    const workspaceId = await getCurrentUserWorkspace();
    if (!workspaceId) return;

    try {
      await supabase.from('rec_events').insert({
        workspace_id: workspaceId,
        event_type: `trade.${request.source}.executed`,
        severity: 1,
        entity_type: 'trade',
        entity_id: request.symbol,
        summary: `${request.source} ${request.side} executed: ${request.quantity} shares of ${request.symbol}`,
        payload_json: {
          order_id: orderId,
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          price: request.price,
          order_type: request.orderType,
          source: request.source,
          bot_id: request.botId,
          stop_loss: request.stopLoss,
          take_profit: request.takeProfit
        }
      });
    } catch (error) {
      logService.log('error', 'Failed to log trade execution', { error });
    }
  }

  /**
   * Manual refresh - forces immediate sync
   */
  async refresh(): Promise<{ success: boolean; message: string }> {
    return await this.syncPortfolioData();
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    this.stopAutoSync();
    this.connections = [];
    this.portfolio = null;
    this.isConnected = false;
    
    logService.log('info', 'Unified Brokerage Service shutdown');
  }
}

// Singleton instance
export const unifiedBrokerageService = new UnifiedBrokerageService();