import { BrokerAdapter, Position, PortfolioSummary, TradeOrder, TradeResult } from './BrokerAdapter';
import { logService } from '@/services/logging';
import { supabase } from '@/integrations/supabase/client';

export class AlpacaBrokerAdapter extends BrokerAdapter {
  private alpacaApiKey?: string;
  private alpacaSecretKey?: string;
  private paperBaseUrl = 'https://paper-api.alpaca.markets';
  private liveBaseUrl = 'https://api.alpaca.markets';
  private accountType: 'paper' | 'live' | 'unknown' = 'unknown';

  async connect(apiKey?: string, secretKey?: string): Promise<boolean> {
    // If no keys provided, try to get from stored connections
    if (!apiKey || !secretKey) {
      try {
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-alpaca-credentials');
        if (!keyError && keyData) {
          this.alpacaApiKey = keyData.apiKey;
          this.alpacaSecretKey = keyData.secretKey;
          this.accountType = keyData.accountType || 'paper';
        } else {
          logService.log('warn', 'Could not retrieve stored credentials, using provided keys');
          this.alpacaApiKey = apiKey;
          this.alpacaSecretKey = secretKey;
          // Auto-detect account type when using provided keys
          await this.detectAccountType();
        }
      } catch (error) {
        logService.log('warn', 'Failed to get stored credentials', { error });
        this.alpacaApiKey = apiKey;
        this.alpacaSecretKey = secretKey;
        await this.detectAccountType();
      }
    } else {
      this.alpacaApiKey = apiKey;
      this.alpacaSecretKey = secretKey;
      // Auto-detect account type for new credentials
      await this.detectAccountType();
    }
    
    try {
      // Test connection using detected account type
      const baseUrl = this.accountType === 'live' ? this.liveBaseUrl : this.paperBaseUrl;
      const response = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey!,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`Alpaca connection failed: ${response.status}`);
      }

      this.connected = true;
      logService.log('info', `Connected to Alpaca ${this.accountType} trading`, { 
        status: response.status,
        accountType: this.accountType
      });
      return true;
    } catch (error) {
      logService.log('error', 'Alpaca connection failed', { error });
      this.connected = false;
      return false;
    }
  }

  private async detectAccountType(): Promise<void> {
    if (!this.alpacaApiKey || !this.alpacaSecretKey) {
      return;
    }

    try {
      // Test paper trading endpoint first
      const paperResponse = await fetch(`${this.paperBaseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey,
        },
      });

      if (paperResponse.ok) {
        this.accountType = 'paper';
        logService.log('info', 'Auto-detected paper trading account');
        return;
      }

      // Test live trading endpoint
      const liveResponse = await fetch(`${this.liveBaseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey,
        },
      });

      if (liveResponse.ok) {
        this.accountType = 'live';
        logService.log('info', 'Auto-detected live trading account');
        return;
      }

      this.accountType = 'unknown';
      logService.log('warn', 'Could not determine account type');
    } catch (error) {
      logService.log('error', 'Failed to detect account type', { error });
      this.accountType = 'unknown';
    }
  }

  getAccountType(): 'paper' | 'live' | 'unknown' {
    return this.accountType;
  }

  isLiveTrading(): boolean {
    return this.accountType === 'live';
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.alpacaApiKey = undefined;
    this.alpacaSecretKey = undefined;
    logService.log('info', 'Disconnected from Alpaca');
  }

  async fetchPortfolio(): Promise<PortfolioSummary> {
    if (!this.connected || !this.alpacaApiKey || !this.alpacaSecretKey) {
      throw new Error('Not connected to Alpaca');
    }

    try {
      const baseUrl = this.accountType === 'live' ? this.liveBaseUrl : this.paperBaseUrl;
      
      // Fetch account info
      const accountResponse = await fetch(`${baseUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey,
        },
      });

      if (!accountResponse.ok) {
        throw new Error(`Failed to fetch account: ${accountResponse.status}`);
      }

      const account = await accountResponse.json();

      // Fetch positions
      const positionsResponse = await fetch(`${baseUrl}/v2/positions`, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey,
        },
      });

      if (!positionsResponse.ok) {
        throw new Error(`Failed to fetch positions: ${positionsResponse.status}`);
      }

      const alpacaPositions = await positionsResponse.json();

      // Convert Alpaca positions to our format
      const positions: Position[] = alpacaPositions.map((pos: any) => ({
        symbol: pos.symbol,
        name: pos.symbol, // Alpaca doesn't provide company names in positions
        shares: parseFloat(pos.qty),
        avgPrice: parseFloat(pos.avg_cost || pos.cost_basis),
        currentPrice: parseFloat(pos.market_value) / parseFloat(pos.qty),
        marketValue: parseFloat(pos.market_value),
        gainLoss: parseFloat(pos.unrealized_pl),
        gainLossPercent: parseFloat(pos.unrealized_plpc) * 100,
        allocation: 0 // Will calculate below
      }));

      const totalValue = parseFloat(account.portfolio_value);
      const availableCash = parseFloat(account.buying_power);
      const totalGainLoss = parseFloat(account.unrealized_pl);
      const dayChange = parseFloat(account.unrealized_pl); // Simplified

      // Calculate allocations
      positions.forEach(pos => {
        pos.allocation = (pos.marketValue / totalValue) * 100;
      });

      return {
        totalValue,
        dayChange,
        dayChangePercent: totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
        totalGainLoss,
        totalGainLossPercent: totalValue > 0 ? (totalGainLoss / totalValue) * 100 : 0,
        availableCash,
        positions
      };
    } catch (error) {
      logService.log('error', 'Failed to fetch Alpaca portfolio', { error });
      throw error;
    }
  }

  async placeTrade(order: TradeOrder): Promise<TradeResult> {
    if (!this.connected || !this.alpacaApiKey || !this.alpacaSecretKey) {
      throw new Error('Not connected to Alpaca');
    }

    try {
      const baseUrl = this.accountType === 'live' ? this.liveBaseUrl : this.paperBaseUrl;
      
      const alpacaOrder = {
        symbol: order.symbol,
        qty: order.quantity.toString(),
        side: order.side,
        type: this.mapOrderType(order.orderType),
        time_in_force: 'day',
        ...(order.price && { limit_price: order.price.toString() }),
        ...(order.stopPrice && { stop_price: order.stopPrice.toString() })
      };

      const response = await fetch(`${baseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
          'APCA-API-KEY-ID': this.alpacaApiKey,
          'APCA-API-SECRET-KEY': this.alpacaSecretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alpacaOrder),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Order failed: ${errorData.message || response.status}`);
      }

      const alpacaResult = await response.json();

      const result: TradeResult = {
        orderId: alpacaResult.id,
        symbol: alpacaResult.symbol,
        side: alpacaResult.side,
        quantity: parseFloat(alpacaResult.qty),
        price: parseFloat(alpacaResult.filled_avg_price || alpacaResult.limit_price || '0'),
        timestamp: new Date(alpacaResult.created_at),
        status: this.mapOrderStatus(alpacaResult.status)
      };

      logService.log('info', `Alpaca ${this.accountType} trade placed`, result);
      return result;
    } catch (error) {
      logService.log('error', 'Alpaca trade failed', { error, order });
      throw error;
    }
  }

  async getAccountInfo(): Promise<any> {
    if (!this.connected || !this.alpacaApiKey || !this.alpacaSecretKey) {
      throw new Error('Not connected to Alpaca');
    }

    const baseUrl = this.accountType === 'live' ? this.liveBaseUrl : this.paperBaseUrl;
    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': this.alpacaApiKey,
        'APCA-API-SECRET-KEY': this.alpacaSecretKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.status}`);
    }

    return await response.json();
  }

  private mapOrderType(orderType: string): string {
    switch (orderType) {
      case 'market': return 'market';
      case 'limit': return 'limit';
      case 'stop': return 'stop';
      default: return 'market';
    }
  }

  private mapOrderStatus(alpacaStatus: string): 'pending' | 'filled' | 'cancelled' | 'rejected' {
    switch (alpacaStatus) {
      case 'new':
      case 'partially_filled':
      case 'accepted':
        return 'pending';
      case 'filled':
        return 'filled';
      case 'canceled':
      case 'expired':
        return 'cancelled';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  }
}