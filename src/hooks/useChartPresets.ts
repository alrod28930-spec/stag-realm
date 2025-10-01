/**
 * Chart layout presets system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChartPreset {
  id: string;
  name: string;
  charts: {
    symbol: string;
    timeframe: string;
    indicators: string[];
  }[];
  layout: '1x1' | '2x1' | '2x2';
}

interface ChartPresetsState {
  presets: ChartPreset[];
  currentPreset: string | null;
  addPreset: (preset: Omit<ChartPreset, 'id'>) => void;
  removePreset: (id: string) => void;
  applyPreset: (id: string) => ChartPreset | null;
  setCurrentPreset: (id: string | null) => void;
}

// Default presets
const defaultPresets: ChartPreset[] = [
  {
    id: 'day-trader',
    name: 'Day Trader',
    layout: '2x2',
    charts: [
      { symbol: 'SPY', timeframe: '1m', indicators: ['vwap', 'ema9'] },
      { symbol: 'QQQ', timeframe: '5m', indicators: ['vwap', 'ema9'] },
      { symbol: 'AAPL', timeframe: '1m', indicators: ['vwap'] },
      { symbol: 'TSLA', timeframe: '5m', indicators: ['vwap'] },
    ],
  },
  {
    id: 'swing-trader',
    name: 'Swing Trader',
    layout: '2x1',
    charts: [
      { symbol: 'SPY', timeframe: '15m', indicators: ['sma20', 'sma50', 'vwap'] },
      { symbol: 'QQQ', timeframe: '1h', indicators: ['sma20', 'sma50', 'vwap'] },
    ],
  },
  {
    id: 'investor',
    name: 'Investor',
    layout: '2x2',
    charts: [
      { symbol: 'SPY', timeframe: '1D', indicators: ['sma50', 'sma200'] },
      { symbol: 'QQQ', timeframe: '1D', indicators: ['sma50', 'sma200'] },
      { symbol: 'AAPL', timeframe: '1D', indicators: ['sma50'] },
      { symbol: 'MSFT', timeframe: '1D', indicators: ['sma50'] },
    ],
  },
];

export const useChartPresets = create<ChartPresetsState>()(
  persist(
    (set, get) => ({
      presets: defaultPresets,
      currentPreset: null,

      addPreset: (preset) => {
        const id = `custom-${Date.now()}`;
        const newPreset = { ...preset, id };
        set((state) => ({
          presets: [...state.presets, newPreset],
        }));
      },

      removePreset: (id) => {
        // Don't allow removing default presets
        if (id.startsWith('day-trader') || id.startsWith('swing-trader') || id.startsWith('investor')) {
          return;
        }
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          currentPreset: state.currentPreset === id ? null : state.currentPreset,
        }));
      },

      applyPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({ currentPreset: id });
        }
        return preset || null;
      },

      setCurrentPreset: (id) => set({ currentPreset: id }),
    }),
    {
      name: 'chart-presets',
    }
  )
);
