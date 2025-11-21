import { eventBus } from './eventBus';
import { logService } from './logging';

// Comprehensive demo portfolio data
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
    confidence: 0.85,
    summary: 'Strong bullish momentum with RSI oversold recovery and volume confirmation',
    source: 'Technical Analysis Engine',
    ts: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    tf: '1H',
    workspace_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 'demo-signal-2',
    symbol: 'NVDA',
    signal_type: 'sentiment',
    direction: 1,
    strength: 0.92,
    confidence: 0.90,
    summary: 'Positive sentiment surge following AI chip demand reports',
    source: 'News Sentiment Engine',
    ts: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tf: '1H',
    workspace_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 'demo-signal-3',
    symbol: 'TSLA',
    signal_type: 'technical',
    direction: -1,
    strength: 0.75,
    confidence: 0.72,
    summary: 'Bearish divergence detected with declining volume',
    source: 'Technical Analysis Engine',
    ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tf: '1H',
    workspace_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    id: 'demo-signal-4',
    symbol: 'MSFT',
    signal_type: 'momentum',
    direction: 1,
    strength: 0.68,
    confidence: 0.75,
    summary: 'Moderate upward momentum with increasing institutional buying',
    source: 'Flow Analysis Engine',
    ts: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    tf: '1H',
    workspace_id: '00000000-0000-0000-0000-000000000001'
  }
];

// Demo trade history with proper structure for KPI calculations
export const DEMO_TRADE_HISTORY = [
  {
    id: 'demo-trade-1',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 50,
    price: 172.45,
    fees: 0.50,
    status: 'filled',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pnl: 175.00
  },
  {
    id: 'demo-trade-2',
    symbol: 'MSFT',
    side: 'sell',
    quantity: 25,
    price: 415.20,
    fees: 0.25,
    status: 'filled',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    pnl: 287.50
  },
  {
    id: 'demo-trade-3',
    symbol: 'NVDA',
    side: 'buy',
    quantity: 15,
    price: 895.75,
    fees: 0.75,
    status: 'filled',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pnl: 325.50
  },
  {
    id: 'demo-trade-4',
    symbol: 'TSLA',
    side: 'sell',
    quantity: 30,
    price: 248.90,
    fees: 0.30,
    status: 'filled',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    pnl: -87.25
  },
  {
    id: 'demo-trade-5',
    symbol: 'GOOGL',
    side: 'buy',
    quantity: 40,
    price: 140.15,
    fees: 0.40,
    status: 'filled',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    pnl: 156.80
  },
  {
    id: 'demo-trade-6',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 45,
    price: 168.20,
    fees: 0.45,
    status: 'filled',
    timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    pnl: 265.50
  },
  {
    id: 'demo-trade-7',
    symbol: 'MSFT',
    side: 'sell',
    quantity: 20,
    price: 418.75,
    fees: 0.20,
    status: 'filled',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    pnl: -45.00
  },
  {
    id: 'demo-trade-8',
    symbol: 'NVDA',
    side: 'buy',
    quantity: 10,
    price: 912.30,
    fees: 0.50,
    status: 'filled',
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    pnl: 89.75
  }
];

// Demo analytics/KPIs
export const DEMO_ANALYTICS = {
  totalReturn: 15.7,
  sharpeRatio: 1.42,
  maxDrawdown: -3.2,
  winRate: 75.00,
  avgWin: 215.01,
  avgLoss: -66.13,
  expectancy: 145.98,
  totalTrades: 8,
  winningTrades: 6,
  losingTrades: 2,
  totalPnL: 1167.80,
  avgHoldHours: 24,
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

// Demo bot configuration
export const DEMO_BOT_PROFILE = {
  workspace_id: '00000000-0000-0000-0000-000000000001',
  active: false,
  mode: 'paper',
  name: 'Demo Trading Bot',
  risk_per_trade_pct: 0.02,
  max_concurrent_positions: 3,
  max_trades_per_day: 5,
  execution_mode: 'manual',
  signal_confidence_min: 0.7,
  rr_min: 1.5,
  stop_style: 'atr',
  capital_risk_pct: 0.10,
  daily_loss_halt_pct: 0.03,
  pdt_guard: true
};

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

  getBotProfile() {
    return DEMO_BOT_PROFILE;
  }

  getSearchResults(query?: string, limit = 10) {
    return DEMO_SEARCH_RESULTS.slice(0, limit);
  }

  // Get demo candle data for charts
  getDemoCandles(symbol: string, tf: string, limit = 100) {
    const now = Date.now();
    const tfMinutes = tf === '1D' ? 1440 : tf === '1H' ? 60 : tf === '5m' ? 5 : 1;
    const candles = [];
    
    let basePrice = 100;
    if (symbol === 'AAPL') basePrice = 174;
    if (symbol === 'MSFT') basePrice = 420;
    if (symbol === 'NVDA') basePrice = 917;
    if (symbol === 'GOOGL') basePrice = 141;
    if (symbol === 'TSLA') basePrice = 257;

    for (let i = limit; i >= 0; i--) {
      const timestamp = new Date(now - i * tfMinutes * 60 * 1000);
      const volatility = Math.random() * 0.02 - 0.01; // ±1%
      const open = basePrice * (1 + volatility);
      const high = open * (1 + Math.abs(volatility) * 1.5);
      const low = open * (1 - Math.abs(volatility) * 1.5);
      const close = open * (1 + volatility * 0.5);
      
      candles.push({
        ts: timestamp.toISOString(),
        o: Number(open.toFixed(2)),
        h: Number(high.toFixed(2)),
        l: Number(low.toFixed(2)),
        c: Number(close.toFixed(2)),
        v: Math.floor(Math.random() * 1000000),
        vwap: Number(((open + close) / 2).toFixed(2))
      });
      
      basePrice = close; // Next candle starts at previous close
    }
    
    return candles;
  }

  // Simulate placing a trade (no real execution)
  async placeDemoTrade(order: any) {
    logService.log('info', 'Demo trade placed (simulation only)', order);
    
    const demoResult = {
      id: `demo-${Date.now()}`,
      ...order,
      status: 'filled',
      timestamp: new Date().toISOString(),
      fees: Math.round(order.quantity * order.price * 0.001 * 100) / 100,
      pnl: 0
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
      },
      {
        id: 'demo-news-3',
        headline: 'Microsoft Azure Cloud Growth Accelerates',
        source: 'Demo Tech Report',
        sentiment: 0.75,
        symbol: 'MSFT',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      }
    ];
  }
}

export const demoDataService = DemoDataService.getInstance();
