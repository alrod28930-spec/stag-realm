import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BrokerageDockConfig {
  defaultUrl: string;
  quickAccessUrls: Array<{
    name: string;
    url: string;
    category: 'trading' | 'research' | 'news' | 'analysis';
  }>;
  autoLoadSymbols: boolean;
  preferredChartProvider: string;
}

interface BrokerageDockState {
  currentUrl: string;
  config: BrokerageDockConfig;
  activeSymbol: string | null;
  contextData: {
    symbol?: string;
    price?: number;
    direction?: 'buy' | 'sell';
    quantity?: number;
  } | null;
  
  // Actions
  setCurrentUrl: (url: string) => void;
  updateConfig: (config: Partial<BrokerageDockConfig>) => void;
  sendSymbolContext: (symbol: string, data?: any) => void;
  sendTradeContext: (tradeData: any) => void;
  clearContext: () => void;
  navigateToSymbolChart: (symbol: string) => void;
}

const defaultConfig: BrokerageDockConfig = {
  defaultUrl: 'https://www.tradingview.com',
  quickAccessUrls: [
    { name: 'TradingView', url: 'https://www.tradingview.com', category: 'analysis' },
    { name: 'Yahoo Finance', url: 'https://finance.yahoo.com', category: 'research' },
    { name: 'MarketWatch', url: 'https://www.marketwatch.com', category: 'news' },
    { name: 'Investing.com', url: 'https://www.investing.com', category: 'research' },
    { name: 'Finviz', url: 'https://finviz.com', category: 'analysis' },
    { name: 'SEC EDGAR', url: 'https://www.sec.gov/edgar', category: 'research' }
  ],
  autoLoadSymbols: true,
  preferredChartProvider: 'tradingview'
};

export const useBrokerageDockStore = create<BrokerageDockState>()(
  persist(
    (set, get) => ({
      currentUrl: defaultConfig.defaultUrl,
      config: defaultConfig,
      activeSymbol: null,
      contextData: null,

      setCurrentUrl: (url: string) => {
        set({ currentUrl: url });
      },

      updateConfig: (configUpdate: Partial<BrokerageDockConfig>) => {
        set(state => ({
          config: { ...state.config, ...configUpdate }
        }));
      },

      sendSymbolContext: (symbol: string, data?: any) => {
        const { config } = get();
        
        set({ 
          activeSymbol: symbol,
          contextData: { symbol, ...data }
        });

        // Auto-navigate to chart if enabled
        if (config.autoLoadSymbols) {
          get().navigateToSymbolChart(symbol);
        }
      },

      sendTradeContext: (tradeData: any) => {
        set({ contextData: tradeData });
        
        if (tradeData.symbol) {
          get().sendSymbolContext(tradeData.symbol, tradeData);
        }
      },

      clearContext: () => {
        set({ 
          activeSymbol: null,
          contextData: null 
        });
      },

      navigateToSymbolChart: (symbol: string) => {
        const { config } = get();
        let chartUrl = config.defaultUrl;

        // Build chart URL based on provider
        switch (config.preferredChartProvider) {
          case 'tradingview':
            chartUrl = `https://www.tradingview.com/chart/?symbol=${symbol}`;
            break;
          case 'yahoo':
            chartUrl = `https://finance.yahoo.com/quote/${symbol}`;
            break;
          case 'marketwatch':
            chartUrl = `https://www.marketwatch.com/investing/stock/${symbol}`;
            break;
          default:
            chartUrl = `https://www.tradingview.com/chart/?symbol=${symbol}`;
        }

        set({ currentUrl: chartUrl });
      }
    }),
    {
      name: 'brokerage-dock-store',
      partialize: (state) => ({ config: state.config })
    }
  )
);