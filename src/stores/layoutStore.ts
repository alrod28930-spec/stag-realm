/**
 * Layout store with auto-save for chart persistence
 * Saves every 2.5s when dirty, persists across tabs
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWorkspace } from '@/utils/auth';
import { logService } from '@/services/logging';

export interface ChartLayout {
  id: string;
  symbol: string;
  timeframe: string;
  indicators: string[];
  deployedBot?: string;
  isAutomated?: boolean;
}

export interface MultiChartLayout {
  version: number;
  chartLayout: '1x1' | '2x1' | '2x2';
  charts: ChartLayout[];
  selectedChart: string;
}

interface LayoutState {
  layout: MultiChartLayout;
  dirty: boolean;
  saving: boolean;
  
  // Actions
  setLayout: (layout: MultiChartLayout) => void;
  updateChart: (chartId: string, updates: Partial<ChartLayout>) => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

const defaultLayout: MultiChartLayout = {
  version: 1,
  chartLayout: '2x2',
  charts: [
    { id: '1', symbol: 'AAPL', timeframe: '1D', indicators: ['vwap'] },
    { id: '2', symbol: 'TSLA', timeframe: '1D', indicators: ['vwap', 'sma9'] },
    { id: '3', symbol: 'SPY', timeframe: '1D', indicators: ['sma21'] },
    { id: '4', symbol: 'QQQ', timeframe: '1D', indicators: ['vwap'] }
  ],
  selectedChart: '1'
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: defaultLayout,
  dirty: false,
  saving: false,

  setLayout: (layout: MultiChartLayout) => {
    set({ layout, dirty: true });
  },

  updateChart: (chartId: string, updates: Partial<ChartLayout>) => {
    const { layout } = get();
    const newLayout: MultiChartLayout = {
      ...layout,
      charts: layout.charts.map(chart =>
        chart.id === chartId ? { ...chart, ...updates } : chart
      ),
    };
    set({ layout: newLayout, dirty: true });
  },

  save: async () => {
    const { layout, dirty, saving } = get();
    
    if (!dirty || saving) return;

    set({ saving: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const workspaceId = await getCurrentUserWorkspace();

      if (!user || !workspaceId) {
        throw new Error('No user or workspace');
      }

      const { error } = await supabase
        .from('chart_layouts')
        .upsert({
          workspace_id: workspaceId,
          user_id: user.id,
          name: 'default',
          layout: layout as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,user_id,name'
        });

      if (error) throw error;

      set({ dirty: false });
      logService.log('info', 'Chart layout saved', { charts: layout.charts.length });
    } catch (error) {
      logService.log('error', 'Failed to save chart layout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ saving: false });
    }
  },

  load: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const workspaceId = await getCurrentUserWorkspace();

      if (!user || !workspaceId) {
        logService.log('warn', 'Cannot load layout: no user/workspace');
        return;
      }

      const { data, error } = await supabase
        .from('chart_layouts')
        .select('layout')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('name', 'default')
        .maybeSingle();

      if (error) {
        logService.log('warn', 'Failed to load chart layout', {
          error: error.message,
        });
        return;
      }

      if (data?.layout) {
        const loadedLayout = data.layout as unknown as MultiChartLayout;
        set({ layout: loadedLayout, dirty: false });
        logService.log('info', 'Chart layout loaded');
      }
    } catch (error) {
      logService.log('error', 'Error loading chart layout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
}));

// Auto-save every 2.5s when dirty
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useLayoutStore.getState();
    if (store.dirty && !store.saving) {
      store.save();
    }
  }, 2500);
}
