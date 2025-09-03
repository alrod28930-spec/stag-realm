import { eventBus } from './eventBus';
import { logService } from './logging';

// Demo portfolio data
export const DEMO_PORTFOLIO = {
  cash: 125000.50,
  equity: 247845.75,
  totalValue: 372846.25,
  dayChange: 3245.67,
  dayChangePercent: 0.88,
  positions: [
    {
      symbol: 'AAPL',
      qty: 150,
      avg_cost: 175.32,
      mv: 26100.00,
      unr_pnl: 3870.00,
      r_pnl: 0,
      updated_at: new Date().toISOString(),
      currentPrice: 174.00,
      changePercent: 1.2
    },
    {
      symbol: 'MSFT',
      qty: 75,
      avg_cost: 412.45,
      mv: 31500.00,
      unr_pnl: 616.25,
      r_pnl: 0,
      updated_at: new Date().toISOString(),
      currentPrice: 420.67,
      changePercent: -0.8
    },
    {
      symbol: 'NVDA',
      qty: 45,
      avg_cost: 875.20,
      mv: 40275.00,
      unr_pnl: 1899.00,
      r_pnl: 0,
      updated_at: new Date().toISOString(),
      currentPrice: 917.40,
      changePercent: 2.3
    },
    {
      symbol: 'GOOGL',
      qty: 85,
      avg_cost: 138.90,
      mv: 12035.00,
      unr_pnl: 227.50,
      r_pnl: 0,
      updated_at: new Date().toISOString(),
      currentPrice: 141.58,
      changePercent: 0.6
    },
    {
      symbol: 'TSLA',
      qty: 120,
      avg_cost: 245.67,
      mv: 30840.00,
      unr_pnl: 1359.60,
      r_pnl: 0,
      updated_at: new Date().toISOString(),
      currentPrice: 257.00,
      changePercent: -1.4
    }
  ]
};

// Demo oracle signals
export const DEMO_ORACLE_SIGNALS = [
  {
    id: 'demo-signal-1',
    symbol: 'AAPL',
    signal_type: 'technical',
    direction: 1,
    strength: 0.87,
    summary: 'Strong bullish momentum with RSI oversold recovery and volume confirmation',
    source: 'Technical Analysis Engine',
    ts: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    workspace_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 'demo-signal-2',
    symbol: 'NVDA',
    signal_type: 'sentiment',
    direction: 1,
    strength: 0.92,
    summary: 'Positive sentiment surge following AI chip demand reports',
    source: 'News Sentiment Engine',
    ts: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    workspace_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 'demo-signal-3',
    symbol: 'TSLA',
    signal_type: 'technical',
    direction: -1,
    strength: 0.75,
    summary: 'Bearish divergence detected with declining volume',
    source: 'Technical Analysis Engine',
    ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    workspace_id: '00000000-0000-0000-0000-000000000001'
  }
];

// Demo trade history
export const DEMO_TRADE_HISTORY = [
  {
    id: 'demo-trade-1',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 50,
    price: 172.45,
    status: 'filled',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    pnl: 175.00,
    commission: 0.50
  },
  {
    id: 'demo-trade-2',
    symbol: 'MSFT',
    side: 'sell',
    quantity: 25,
    price: 415.20,
    status: 'filled',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    pnl: 287.50,
    commission: 0.25
  },
  {
    id: 'demo-trade-3',
    symbol: 'NVDA',
    side: 'buy',
    quantity: 15,
    price: 895.75,
    status: 'filled',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    pnl: 325.50,
    commission: 0.75
  }
];

// Demo analytics/KPIs
export const DEMO_ANALYTICS = {
  totalReturn: 15.7,
  sharpeRatio: 1.42,
  maxDrawdown: -3.2,
  winRate: 67,
  avgWin: 245.67,
  avgLoss: -123.45,
  totalTrades: 28,
  weeklyReturns: [2.1, -0.8, 1.4, 3.2, -1.1, 0.9, 2.5],
  monthlyReturns: [5.2, -2.1, 8.7, 3.4, -1.8, 6.9, 2.3, 4.1, -0.5, 7.2, 1.8, 3.6]
};

// Demo market search results
export const DEMO_SEARCH_RESULTS = [
  {
    symbol: 'AMD',
    relevance_score: 0.95,
    features: {
      technical_score: 0.89,
      sentiment_score: 0.92,
      volume_score: 0.88,
      momentum_score: 0.91
    },
    currentPrice: 142.67,
    changePercent: 2.8
  },
  {
    symbol: 'QCOM',
    relevance_score: 0.87,
    features: {
      technical_score: 0.82,
      sentiment_score: 0.85,
      volume_score: 0.91,
      momentum_score: 0.89
    },
    currentPrice: 167.23,
    changePercent: 1.5
  },
  {
    symbol: 'INTC',
    relevance_score: 0.79,
    features: {
      technical_score: 0.75,
      sentiment_score: 0.81,
      volume_score: 0.82,
      momentum_score: 0.78
    },
    currentPrice: 43.21,
    changePercent: -0.9
  }
];

class DemoDataService {
  private static instance: DemoDataService;
  private isActive = false;

  static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  activate(): void {
    this.isActive = true;
    logService.log('info', 'Demo data service activated');
    eventBus.emit('demo.activated', { timestamp: new Date() });
  }

  deactivate(): void {
    this.isActive = false;
    logService.log('info', 'Demo data service deactivated');
    eventBus.emit('demo.deactivated', { timestamp: new Date() });
  }

  isActiveDemo(): boolean {
    return this.isActive;
  }

  getPortfolio() {
    return DEMO_PORTFOLIO;
  }

  getOracleSignals(limit = 20) {
    return DEMO_ORACLE_SIGNALS.slice(0, limit);
  }

  getTradeHistory(limit = 50) {
    return DEMO_TRADE_HISTORY.slice(0, limit);
  }

  getAnalytics() {
    return DEMO_ANALYTICS;
  }

  getSearchResults(query?: string, limit = 10) {
    return DEMO_SEARCH_RESULTS.slice(0, limit);
  }

  // Simulate placing a trade (no real execution)
  async placeDemoTrade(order: any) {
    logService.log('info', 'Demo trade placed (simulation only)', order);
    
    const demoResult = {
      id: `demo-${Date.now()}`,
      ...order,
      status: 'filled',
      timestamp: new Date().toISOString(),
      commission: Math.round(order.quantity * order.price * 0.001 * 100) / 100, // 0.1% commission
      pnl: 0 // Initial PnL is 0
    };

    eventBus.emit('demo.trade.placed', demoResult);
    return demoResult;
  }

  // Get demo news/alerts
  getDemoNews() {
    return [
      {
        id: 'demo-news-1',
        headline: 'Tech Stocks Rally on AI Optimism',
        source: 'Demo Financial News',
        sentiment: 0.8,
        symbol: 'NVDA',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-news-2',
        headline: 'Apple Reports Strong Quarter Results',
        source: 'Demo Market Watch',
        sentiment: 0.7,
        symbol: 'AAPL',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
  }
}

export const demoDataService = DemoDataService.getInstance();