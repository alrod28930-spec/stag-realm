import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
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
    try {
      set({ isLoading: true, error: null });

      // Get current user's workspace instead of hardcoded ID
      const { getCurrentUserWorkspace } = await import('@/utils/auth');
      const workspaceId = await getCurrentUserWorkspace();
      
      if (!workspaceId) {
        set({ 
          error: 'No workspace found - please ensure you are logged in',
          isLoading: false 
        });
        return;
      }

      // Load portfolio summary
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_current')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (portfolioError && portfolioError.code !== 'PGRST116') { 
        throw portfolioError;
      }

      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions_current')
        .select('*')
        .eq('workspace_id', workspaceId)
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
    // Get workspace ID dynamically
    const setupSubscriptions = async () => {
      const { getCurrentUserWorkspace } = await import('@/utils/auth');
      const workspaceId = await getCurrentUserWorkspace();
      
      if (!workspaceId) {
        console.warn('Cannot set up subscriptions - no workspace found');
        return () => {};
      }

      // Subscribe to portfolio changes
      const portfolioChannel = supabase
        .channel('portfolio-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portfolio_current',
            filter: `workspace_id=eq.${workspaceId}`
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
            filter: `workspace_id=eq.${workspaceId}`
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
    };
    
    // Execute async setup and return cleanup
    let cleanupFn = () => {};
    setupSubscriptions().then(cleanup => {
      cleanupFn = cleanup;
    });
    
    return () => cleanupFn();
  },

  refreshData: async () => {
    await get().loadPortfolio();
  }
}));