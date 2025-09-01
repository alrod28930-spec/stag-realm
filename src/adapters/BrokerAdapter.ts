import { logService } from '@/services/logging';

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  allocation: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  availableCash: number;
  positions: Position[];
}

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopPrice?: number;
}

export interface TradeResult {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

// Abstract base class for broker adapters
export abstract class BrokerAdapter {
  protected connected: boolean = false;
  protected apiKey?: string;
  protected baseUrl?: string;

  abstract connect(apiKey: string, baseUrl?: string): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract fetchPortfolio(): Promise<PortfolioSummary>;
  abstract placeTrade(order: TradeOrder): Promise<TradeResult>;
  abstract getAccountInfo(): Promise<any>;
  
  isConnected(): boolean {
    return this.connected;
  }
}

// Fake implementation for testing and development
export class FakeBrokerAdapter extends BrokerAdapter {
  private mockPositions: Position[] = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 100,
      avgPrice: 165.30,
      currentPrice: 175.50,
      marketValue: 17550.00,
      gainLoss: 1020.00,
      gainLossPercent: 6.17,
      allocation: 13.97
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      shares: 50,
      avgPrice: 145.80,
      currentPrice: 142.30,
      marketValue: 7115.00,
      gainLoss: -175.00,
      gainLossPercent: -2.40,
      allocation: 5.67
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      shares: 75,
      avgPrice: 350.25,
      currentPrice: 378.90,
      marketValue: 28417.50,
      gainLoss: 2149.75,
      gainLossPercent: 8.18,
      allocation: 22.66
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      shares: 25,
      avgPrice: 275.60,
      currentPrice: 248.75,
      marketValue: 6218.75,
      gainLoss: -671.25,
      gainLossPercent: -9.73,
      allocation: 4.96
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      shares: 40,
      avgPrice: 825.45,
      currentPrice: 875.30,
      marketValue: 35012.00,
      gainLoss: 1994.00,
      gainLossPercent: 6.04,
      allocation: 27.91
    }
  ];

  async connect(apiKey: string, baseUrl?: string): Promise<boolean> {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connected = true;
    logService.log('info', 'Connected to fake broker adapter', { apiKey: apiKey.slice(0, 8) + '...' });
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.apiKey = undefined;
    this.baseUrl = undefined;
    logService.log('info', 'Disconnected from fake broker adapter');
  }

  async fetchPortfolio(): Promise<PortfolioSummary> {
    if (!this.connected) {
      throw new Error('Not connected to broker');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add some random price fluctuation
    const positions = this.mockPositions.map(pos => ({
      ...pos,
      currentPrice: pos.currentPrice * (1 + (Math.random() - 0.5) * 0.02), // ±1% variation
    }));

    // Recalculate values
    positions.forEach(pos => {
      pos.marketValue = pos.shares * pos.currentPrice;
      pos.gainLoss = pos.marketValue - (pos.shares * pos.avgPrice);
      pos.gainLossPercent = (pos.gainLoss / (pos.shares * pos.avgPrice)) * 100;
    });

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalCost = positions.reduce((sum, pos) => sum + (pos.shares * pos.avgPrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const availableCash = 25000.00;

    // Recalculate allocations
    positions.forEach(pos => {
      pos.allocation = (pos.marketValue / (totalValue + availableCash)) * 100;
    });

    return {
      totalValue: totalValue + availableCash,
      dayChange: totalGainLoss * 0.1, // Assume 10% of total gain happened today
      dayChangePercent: (totalGainLoss * 0.1 / totalValue) * 100,
      totalGainLoss,
      totalGainLossPercent: (totalGainLoss / totalCost) * 100,
      availableCash,
      positions
    };
  }

  async placeTrade(order: TradeOrder): Promise<TradeResult> {
    if (!this.connected) {
      throw new Error('Not connected to broker');
    }

    // Simulate order processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const result: TradeResult = {
      orderId: `FAKE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price || this.getRandomPrice(order.symbol),
      timestamp: new Date(),
      status: Math.random() > 0.1 ? 'filled' : 'rejected' // 90% success rate
    };

    logService.log('info', 'Fake trade executed', result);
    return result;
  }

  async getAccountInfo(): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to broker');
    }

    return {
      accountId: 'FAKE_ACCOUNT_123',
      accountType: 'MARGIN',
      buyingPower: 50000.00,
      equity: 125432.50,
      lastMaintenanceTime: new Date(),
      status: 'ACTIVE'
    };
  }

  private getRandomPrice(symbol: string): number {
    // Return a reasonable fake price based on symbol
    const basePrices: { [key: string]: number } = {
      'AAPL': 175,
      'GOOGL': 142,
      'MSFT': 378,
      'TSLA': 248,
      'NVDA': 875
    };

    const basePrice = basePrices[symbol] || 100;
    return basePrice * (1 + (Math.random() - 0.5) * 0.02); // ±1% variation
  }
}

// Future: AlpacaBrokerAdapter, TDAmeritradeBrokerAdapter, etc.
// export class AlpacaBrokerAdapter extends BrokerAdapter {
//   // Real implementation would go here
// }