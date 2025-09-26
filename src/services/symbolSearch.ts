import { logService } from './logging';

export interface StockSymbol {
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'index' | 'crypto';
  sector?: string;
  market_cap?: number;
  price?: number;
  change?: number;
  change_percent?: number;
}

// Comprehensive stock symbol database for search
const STOCK_DATABASE: StockSymbol[] = [
  // Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Communication Services' },
  { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  
  // Financial Services
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'C', name: 'Citigroup Inc.', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'AXP', name: 'American Express Company', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc. Class A', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  
  // Healthcare & Pharmaceuticals
  { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'ABT', name: 'Abbott Laboratories', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb Company', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  { symbol: 'MDT', name: 'Medtronic plc', exchange: 'NYSE', type: 'stock', sector: 'Healthcare' },
  
  // Consumer & Retail
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'stock', sector: 'Consumer Staples' },
  { symbol: 'PG', name: 'Procter & Gamble Company', exchange: 'NYSE', type: 'stock', sector: 'Consumer Staples' },
  { symbol: 'KO', name: 'Coca-Cola Company', exchange: 'NYSE', type: 'stock', sector: 'Consumer Staples' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Consumer Staples' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Consumer Staples' },
  { symbol: 'HD', name: 'Home Depot Inc.', exchange: 'NYSE', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', exchange: 'NYSE', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'NKE', name: 'NIKE Inc.', exchange: 'NYSE', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Consumer Discretionary' },
  { symbol: 'TGT', name: 'Target Corporation', exchange: 'NYSE', type: 'stock', sector: 'Consumer Discretionary' },
  
  // Energy & Utilities
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', type: 'stock', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', type: 'stock', sector: 'Energy' },
  { symbol: 'COP', name: 'ConocoPhillips', exchange: 'NYSE', type: 'stock', sector: 'Energy' },
  { symbol: 'EOG', name: 'EOG Resources Inc.', exchange: 'NYSE', type: 'stock', sector: 'Energy' },
  { symbol: 'SLB', name: 'Schlumberger Limited', exchange: 'NYSE', type: 'stock', sector: 'Energy' },
  { symbol: 'NEE', name: 'NextEra Energy Inc.', exchange: 'NYSE', type: 'stock', sector: 'Utilities' },
  { symbol: 'SO', name: 'Southern Company', exchange: 'NYSE', type: 'stock', sector: 'Utilities' },
  { symbol: 'DUK', name: 'Duke Energy Corporation', exchange: 'NYSE', type: 'stock', sector: 'Utilities' },
  
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', type: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE', type: 'etf' },
  { symbol: 'SLV', name: 'iShares Silver Trust', exchange: 'NYSE', type: 'etf' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', exchange: 'NASDAQ', type: 'etf' },
  { symbol: 'HYG', name: 'iShares iBoxx $ High Yield Corporate Bond ETF', exchange: 'NYSE', type: 'etf' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', exchange: 'NYSE', type: 'etf' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund', exchange: 'NYSE', type: 'etf' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund', exchange: 'NYSE', type: 'etf' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', exchange: 'NYSE', type: 'etf' },
  
  // Cryptocurrency
  { symbol: 'BTC-USD', name: 'Bitcoin USD', exchange: 'CRYPTO', type: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', exchange: 'CRYPTO', type: 'crypto' },
  { symbol: 'ADA-USD', name: 'Cardano USD', exchange: 'CRYPTO', type: 'crypto' },
  { symbol: 'SOL-USD', name: 'Solana USD', exchange: 'CRYPTO', type: 'crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin USD', exchange: 'CRYPTO', type: 'crypto' },
  
  // Additional Popular Stocks
  { symbol: 'DIS', name: 'Walt Disney Company', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'T', name: 'AT&T Inc.', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', exchange: 'NASDAQ', type: 'stock', sector: 'Communication Services' },
  { symbol: 'IBM', name: 'International Business Machines Corporation', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Financial Services' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'LYFT', name: 'Lyft Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'SNAP', name: 'Snap Inc.', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'TWTR', name: 'Twitter Inc.', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'SQ', name: 'Block Inc.', exchange: 'NYSE', type: 'stock', sector: 'Financial Services' },
  { symbol: 'ROKU', name: 'Roku Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Communication Services' },
  { symbol: 'ZM', name: 'Zoom Video Communications Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Technology' },
  { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', type: 'stock', sector: 'Technology' },
  { symbol: 'RBLX', name: 'Roblox Corporation', exchange: 'NYSE', type: 'stock', sector: 'Communication Services' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Financial Services' },
  { symbol: 'HOOD', name: 'Robinhood Markets Inc.', exchange: 'NASDAQ', type: 'stock', sector: 'Financial Services' },
];

export class SymbolSearchService {
  private static instance: SymbolSearchService;
  private searchHistory: string[] = [];

  static getInstance(): SymbolSearchService {
    if (!SymbolSearchService.instance) {
      SymbolSearchService.instance = new SymbolSearchService();
    }
    return SymbolSearchService.instance;
  }

  async searchSymbols(query: string, limit: number = 20): Promise<StockSymbol[]> {
    if (!query || query.length < 1) {
      return this.getPopularSymbols(limit);
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Add to search history
    if (!this.searchHistory.includes(query.toUpperCase())) {
      this.searchHistory.unshift(query.toUpperCase());
      this.searchHistory = this.searchHistory.slice(0, 50); // Keep only last 50 searches
    }

    // Search through database
    const results = STOCK_DATABASE.filter(stock => {
      // Match symbol
      if (stock.symbol.toLowerCase().includes(searchTerm)) return true;
      
      // Match company name
      if (stock.name.toLowerCase().includes(searchTerm)) return true;
      
      // Match sector
      if (stock.sector && stock.sector.toLowerCase().includes(searchTerm)) return true;
      
      // Match exchange
      if (stock.exchange.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });

    // Sort results by relevance
    const sortedResults = results.sort((a, b) => {
      // Exact symbol match gets highest priority
      if (a.symbol.toLowerCase() === searchTerm) return -1;
      if (b.symbol.toLowerCase() === searchTerm) return 1;
      
      // Symbol starts with search term
      if (a.symbol.toLowerCase().startsWith(searchTerm) && !b.symbol.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.symbol.toLowerCase().startsWith(searchTerm) && !a.symbol.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Company name starts with search term
      if (a.name.toLowerCase().startsWith(searchTerm) && !b.name.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.name.toLowerCase().startsWith(searchTerm) && !a.name.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Alphabetical by symbol
      return a.symbol.localeCompare(b.symbol);
    });

    // Add current prices (mock data)
    const resultsWithPrices = sortedResults.slice(0, limit).map(stock => ({
      ...stock,
      price: this.getMockPrice(stock.symbol),
      change: this.getMockChange(),
      change_percent: this.getMockChangePercent()
    }));

    logService.log('info', `Symbol search completed`, {
      query,
      resultCount: resultsWithPrices.length
    });

    return resultsWithPrices;
  }

  getPopularSymbols(limit: number = 10): StockSymbol[] {
    const popular = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
      'SPY', 'QQQ', 'IWM', 'VTI', 'JPM', 'JNJ', 'UNH', 'PG'
    ];

    return popular.slice(0, limit).map(symbol => {
      const stock = STOCK_DATABASE.find(s => s.symbol === symbol);
      if (stock) {
        return {
          ...stock,
          price: this.getMockPrice(stock.symbol),
          change: this.getMockChange(),
          change_percent: this.getMockChangePercent()
        };
      }
      return {
        symbol,
        name: 'Unknown Company',
        exchange: 'NYSE',
        type: 'stock' as const,
        price: this.getMockPrice(symbol),
        change: this.getMockChange(),
        change_percent: this.getMockChangePercent()
      };
    });
  }

  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  getSymbolInfo(symbol: string): StockSymbol | null {
    const stock = STOCK_DATABASE.find(s => s.symbol.toLowerCase() === symbol.toLowerCase());
    if (stock) {
      return {
        ...stock,
        price: this.getMockPrice(stock.symbol),
        change: this.getMockChange(),
        change_percent: this.getMockChangePercent()
      };
    }
    return null;
  }

  private getMockPrice(symbol: string): number {
    // Generate consistent mock prices based on symbol
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = 50 + (hash % 500);
    const variation = (Math.sin(Date.now() / 100000 + hash) * 0.1 + 1);
    return Math.round(basePrice * variation * 100) / 100;
  }

  private getMockChange(): number {
    return Math.round((Math.random() - 0.5) * 10 * 100) / 100;
  }

  private getMockChangePercent(): number {
    return Math.round((Math.random() - 0.5) * 8 * 100) / 100;
  }
}

export const symbolSearchService = SymbolSearchService.getInstance();