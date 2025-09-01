import { logService } from './logging';
import { eventBus } from './eventBus';

// Raw data types from various sources
export interface RawBrokerSnapshot {
  timestamp: Date;
  source: string;
  accountId: string;
  equity: number;
  cash: number;
  positions: RawPosition[];
  orders: RawOrder[];
}

export interface RawPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  side: 'long' | 'short';
}

export interface RawOrder {
  id: string;
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  price?: number;
  stopPrice?: number;
  submittedAt: Date;
}

export interface RawMarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: Date;
}

export interface RawCSVImport {
  filename: string;
  headers: string[];
  rows: Record<string, any>[];
  uploadedAt: Date;
}

// Cleaned/validated data types
export interface CleanedSnapshot {
  id: string;
  timestamp: Date;
  source: string;
  accountId: string;
  equity: number;
  cash: number;
  positions: CleanedPosition[];
  orders: CleanedOrder[];
  validated: boolean;
  validationErrors: string[];
}

export interface CleanedPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  side: 'long' | 'short';
  unrealizedPnL: number;
  validated: boolean;
}

export interface CleanedOrder {
  id: string;
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  price?: number;
  stopPrice?: number;
  submittedAt: Date;
  validated: boolean;
}

export interface CleanedMarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  timestamp: Date;
  validated: boolean;
}

// Repository service - the "digestive system"
export class Repository {
  private snapshots: CleanedSnapshot[] = [];
  private marketData: Map<string, CleanedMarketData> = new Map();
  private csvImports: RawCSVImport[] = [];
  
  // Ingest and clean broker snapshot
  async ingestBrokerSnapshot(raw: RawBrokerSnapshot): Promise<CleanedSnapshot> {
    logService.log('info', 'Ingesting broker snapshot', { source: raw.source, accountId: raw.accountId });
    
    try {
      const cleaned: CleanedSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: raw.timestamp,
        source: raw.source,
        accountId: raw.accountId,
        equity: this.validateNumber(raw.equity, 'equity'),
        cash: this.validateNumber(raw.cash, 'cash'),
        positions: raw.positions.map(pos => this.cleanPosition(pos)),
        orders: raw.orders.map(order => this.cleanOrder(order)),
        validated: true,
        validationErrors: []
      };

      // Additional validation
      const errors = this.validateSnapshot(cleaned);
      cleaned.validationErrors = errors;
      cleaned.validated = errors.length === 0;

      // Store cleaned snapshot
      this.snapshots.unshift(cleaned);
      this.snapshots = this.snapshots.slice(0, 100); // Keep last 100 snapshots

      logService.log('info', 'Broker snapshot cleaned and stored', { 
        id: cleaned.id, 
        validated: cleaned.validated,
        errors: errors.length 
      });

      // Forward to BID
      eventBus.emit('repository.snapshot_cleaned', cleaned);
      
      return cleaned;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown cleaning error';
      logService.log('error', 'Failed to clean broker snapshot', { error: errorMessage, raw });
      throw error;
    }
  }

  // Ingest and clean market data
  async ingestMarketData(raw: RawMarketData[]): Promise<CleanedMarketData[]> {
    const cleaned: CleanedMarketData[] = [];
    
    for (const data of raw) {
      try {
        const cleanData: CleanedMarketData = {
          symbol: data.symbol.toUpperCase(),
          price: this.validateNumber(data.price, 'price'),
          bid: this.validateNumber(data.bid, 'bid'),
          ask: this.validateNumber(data.ask, 'ask'),
          spread: data.ask - data.bid,
          volume: this.validateNumber(data.volume, 'volume'),
          timestamp: data.timestamp,
          validated: true
        };

        // Store latest market data
        this.marketData.set(cleanData.symbol, cleanData);
        cleaned.push(cleanData);
        
      } catch (error) {
        logService.log('warn', 'Failed to clean market data point', { symbol: data.symbol, error });
      }
    }

    if (cleaned.length > 0) {
      eventBus.emit('repository.market_data_cleaned', cleaned);
    }

    return cleaned;
  }

  // Ingest CSV import
  async ingestCSV(raw: RawCSVImport): Promise<boolean> {
    logService.log('info', 'Ingesting CSV import', { filename: raw.filename, rows: raw.rows.length });
    
    try {
      // Basic validation
      if (raw.headers.length === 0) {
        throw new Error('No headers found in CSV');
      }
      
      if (raw.rows.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      // Store CSV import
      this.csvImports.unshift(raw);
      this.csvImports = this.csvImports.slice(0, 50); // Keep last 50 imports

      eventBus.emit('repository.csv_imported', raw);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSV import error';
      logService.log('error', 'Failed to ingest CSV', { error: errorMessage, filename: raw.filename });
      return false;
    }
  }

  // Private validation methods
  private cleanPosition(raw: RawPosition): CleanedPosition {
    return {
      symbol: raw.symbol.toUpperCase(),
      quantity: this.validateNumber(raw.quantity, 'quantity'),
      averagePrice: this.validateNumber(raw.averagePrice, 'averagePrice'),
      currentPrice: this.validateNumber(raw.currentPrice, 'currentPrice'),
      marketValue: raw.quantity * raw.currentPrice,
      side: raw.side,
      unrealizedPnL: (raw.currentPrice - raw.averagePrice) * raw.quantity,
      validated: true
    };
  }

  private cleanOrder(raw: RawOrder): CleanedOrder {
    return {
      id: raw.id,
      symbol: raw.symbol.toUpperCase(),
      quantity: this.validateNumber(raw.quantity, 'quantity'),
      side: raw.side,
      type: raw.type,
      status: raw.status,
      price: raw.price ? this.validateNumber(raw.price, 'price') : undefined,
      stopPrice: raw.stopPrice ? this.validateNumber(raw.stopPrice, 'stopPrice') : undefined,
      submittedAt: raw.submittedAt,
      validated: true
    };
  }

  private validateNumber(value: number, field: string): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new Error(`Invalid ${field}: ${value}`);
    }
    return value;
  }

  private validateSnapshot(snapshot: CleanedSnapshot): string[] {
    const errors: string[] = [];
    
    if (snapshot.equity < 0) {
      errors.push('Negative equity detected');
    }
    
    if (snapshot.cash < 0) {
      errors.push('Negative cash balance detected');
    }
    
    // Validate position consistency
    const totalPositionValue = snapshot.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const expectedEquity = snapshot.cash + totalPositionValue;
    
    if (Math.abs(expectedEquity - snapshot.equity) > 1) { // $1 tolerance
      errors.push(`Equity mismatch: expected ${expectedEquity}, got ${snapshot.equity}`);
    }
    
    return errors;
  }

  // Getters for cleaned data
  getLatestSnapshot(): CleanedSnapshot | null {
    return this.snapshots[0] || null;
  }

  getSnapshots(limit = 10): CleanedSnapshot[] {
    return this.snapshots.slice(0, limit);
  }

  getMarketData(symbol?: string): CleanedMarketData | CleanedMarketData[] {
    if (symbol) {
      return this.marketData.get(symbol.toUpperCase()) || null;
    }
    return Array.from(this.marketData.values());
  }

  getCSVImports(limit = 10): RawCSVImport[] {
    return this.csvImports.slice(0, limit);
  }

  // Health check
  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] } {
    const issues: string[] = [];
    
    if (this.snapshots.length === 0) {
      issues.push('No broker snapshots available');
    }
    
    const latestSnapshot = this.getLatestSnapshot();
    if (latestSnapshot && !latestSnapshot.validated) {
      issues.push('Latest snapshot failed validation');
    }
    
    const staleDataThreshold = 5 * 60 * 1000; // 5 minutes
    if (latestSnapshot && Date.now() - latestSnapshot.timestamp.getTime() > staleDataThreshold) {
      issues.push('Stale data detected');
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'unhealthy' : 'degraded';
    }
    
    return { status, issues };
  }
}

// Export singleton instance
export const repository = new Repository();