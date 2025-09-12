import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChartState {
  // Selected symbol and timeframe
  selectedSymbol: string | null;
  timeframe: string;
  chartType: 'candle' | 'line' | 'heikin';
  layout: '1' | '2' | '4';
  
  // Indicators and overlays
  indicators: Record<string, boolean>;
  oracleOverlayEnabled: boolean;
  
  // Chart preferences per symbol
  symbolPreferences: Record<string, {
    indicators: Record<string, boolean>;
    chartType: 'candle' | 'line' | 'heikin';
    timeframe: string;
  }>;
  
  // Recent symbols
  recentSymbols: string[];
  
  // Actions
  setSelectedSymbol: (symbol: string | null) => void;
  setTimeframe: (timeframe: string) => void;
  setChartType: (type: 'candle' | 'line' | 'heikin') => void;
  setLayout: (layout: '1' | '2' | '4') => void;
  toggleIndicator: (indicator: string) => void;
  toggleOracleOverlay: () => void;
  addToRecents: (symbol: string) => void;
  saveSymbolPreferences: (symbol: string) => void;
  loadSymbolPreferences: (symbol: string) => void;
}

export const useChartState = create<ChartState>()(
  persist(
    (set, get) => ({
      selectedSymbol: null,
      timeframe: '15m',
      chartType: 'candle',
      layout: '1',
      indicators: {
        'SMA20': false,
        'SMA50': false,
        'EMA20': false,
        'RSI': false,
        'MACD': false,
        'BB': false,
        'VWAP': false,
        'ATR': false,
      },
      oracleOverlayEnabled: true,
      symbolPreferences: {},
      recentSymbols: [],

      setSelectedSymbol: (symbol) => {
        const state = get();
        if (symbol && symbol !== state.selectedSymbol) {
          // Save current symbol preferences
          if (state.selectedSymbol) {
            state.saveSymbolPreferences(state.selectedSymbol);
          }
          
          // Load new symbol preferences
          state.loadSymbolPreferences(symbol);
          state.addToRecents(symbol);
        }
        set({ selectedSymbol: symbol });
      },

      setTimeframe: (timeframe) => set({ timeframe }),
      
      setChartType: (chartType) => set({ chartType }),
      
      setLayout: (layout) => set({ layout }),
      
      toggleIndicator: (indicator) => set((state) => ({
        indicators: {
          ...state.indicators,
          [indicator]: !state.indicators[indicator]
        }
      })),
      
      toggleOracleOverlay: () => set((state) => ({
        oracleOverlayEnabled: !state.oracleOverlayEnabled
      })),
      
      addToRecents: (symbol) => set((state) => {
        const newRecents = [symbol, ...state.recentSymbols.filter(s => s !== symbol)].slice(0, 6);
        return { recentSymbols: newRecents };
      }),
      
      saveSymbolPreferences: (symbol) => {
        const state = get();
        set({
          symbolPreferences: {
            ...state.symbolPreferences,
            [symbol]: {
              indicators: { ...state.indicators },
              chartType: state.chartType,
              timeframe: state.timeframe
            }
          }
        });
      },
      
      loadSymbolPreferences: (symbol) => {
        const state = get();
        const prefs = state.symbolPreferences[symbol];
        if (prefs) {
          set({
            indicators: { ...prefs.indicators },
            chartType: prefs.chartType,
            timeframe: prefs.timeframe
          });
        }
      }
    }),
    {
      name: 'chart-state',
      partialize: (state) => ({
        timeframe: state.timeframe,
        chartType: state.chartType,
        layout: state.layout,
        indicators: state.indicators,
        oracleOverlayEnabled: state.oracleOverlayEnabled,
        symbolPreferences: state.symbolPreferences,
        recentSymbols: state.recentSymbols
      })
    }
  )
);