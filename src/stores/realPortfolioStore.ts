import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceStore } from './workspaceStore';
import { eventBus } from '@/services/eventBus';
import { logService } from '@/services/logging';

interface Position {
  symbol: string;
  qty: number;
  avg_cost: number;
  mv: number;
  unr_pnl: number;
  r_pnl: number;
  updated_at: string;
}

interface Portfolio {
  cash: number;
  equity: number;
  updated_at: string;
}

interface RealPortfolioState {
  portfolio: Portfolio | null;
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  loadPortfolio: () => Promise<void>;
  subscribeToUpdates: () => () => void;
  refreshData: () => Promise<void>;
}

export const useRealPortfolioStore = create<RealPortfolioState>((set, get) => ({
  portfolio: null,
  positions: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  loadPortfolio: async () => {
    const { currentWorkspace } = useWorkspaceStore.getState();
    if (!currentWorkspace) {
      set({ error: 'No workspace selected' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Load portfolio summary
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_current')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw portfolioError;
      }

      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions_current')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('mv', { ascending: false });

      if (positionsError) throw positionsError;

      set({
        portfolio: portfolioData,
        positions: positionsData || [],
        isLoading: false,
        lastUpdated: new Date(),
        error: null
      });

      eventBus.emit('portfolio.loaded', { 
        portfolio: portfolioData, 
        positions: positionsData 
      });

      logService.log('info', 'Portfolio loaded successfully', {
        positionsCount: positionsData?.length || 0,
        portfolioValue: portfolioData?.equity
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load portfolio';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      
      logService.log('error', 'Portfolio load failed', { error: errorMessage });
      eventBus.emit('portfolio.error', { error: errorMessage });
    }
  },

  subscribeToUpdates: () => {
    const { currentWorkspace } = useWorkspaceStore.getState();
    if (!currentWorkspace) return () => {};

    // Subscribe to portfolio changes
    const portfolioChannel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_current',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        (payload) => {
          const { portfolio } = get();
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            set({ 
              portfolio: payload.new as Portfolio,
              lastUpdated: new Date()
            });
            eventBus.emit('portfolio.updated', payload.new);
          }
        }
      )
      .subscribe();

    // Subscribe to position changes
    const positionsChannel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions_current',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        (payload) => {
          const { positions } = get();
          
          if (payload.eventType === 'INSERT') {
            set({ 
              positions: [payload.new as Position, ...positions],
              lastUpdated: new Date()
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPositions = positions.map(pos => 
              pos.symbol === (payload.new as Position).symbol 
                ? payload.new as Position 
                : pos
            );
            set({ 
              positions: updatedPositions,
              lastUpdated: new Date()
            });
          } else if (payload.eventType === 'DELETE') {
            const filteredPositions = positions.filter(pos => 
              pos.symbol !== (payload.old as Position).symbol
            );
            set({ 
              positions: filteredPositions,
              lastUpdated: new Date()
            });
          }
          
          eventBus.emit('positions.updated', { positions: get().positions });
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(positionsChannel);
    };
  },

  refreshData: async () => {
    await get().loadPortfolio();
  }
}));