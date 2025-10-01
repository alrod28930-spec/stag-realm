import { z } from 'zod';
import { supabase } from './client';

// ============================================================================
// BID Adapter - Backend-first data layer (single source of truth)
// ============================================================================

const OrderWrite = z.object({
  workspace_id: z.string().uuid(),
  run_id: z.string().uuid().optional().nullable(),
  symbol: z.string().regex(/^[A-Z.]{1,10}$/),
  side: z.enum(['buy', 'sell']),
  qty: z.number().positive(),
  price: z.number().positive().optional().nullable(),
  limits: z.object({
    stop_loss_pct: z.number().min(0).max(0.2).optional(),
    take_profit_pct: z.number().min(0).max(0.5).optional(),
  }).optional(),
  validator_status: z.enum(['pass', 'fail']),
  validator_reason: z.string().optional().nullable(),
  broker_status: z.enum(['proposed', 'placed', 'filled', 'canceled', 'rejected', 'error']),
});

const EventRecord = z.object({
  workspace_id: z.string().uuid(),
  actor: z.string(),
  event_type: z.string(),
  payload: z.unknown().optional(),
  ref: z.string().optional(),
});

/**
 * BID Adapter - Single source of truth for all backend data operations.
 * All writes go through validated RPCs; reads use optimized queries.
 */
export const BID = {
  // ========== MARKET DATA (READ) ==========
  
  /**
   * Fetch candles via RPC (canonical read for all charts) - backend-first
   */
  async getCandles(
    workspaceId: string,
    symbol: string,
    tf: '1m' | '5m' | '15m' | '1h' | '1D',
    from?: string,
    to?: string
  ) {
    const fromISO = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toISO = to || new Date().toISOString();

    const { data, error } = await supabase.rpc('fetch_candles', {
      _ws: workspaceId,
      _symbol: symbol,
      _tf: tf,
      _from: fromISO,
      _to: toISO,
    });

    return { data, error };
  },

  /**
   * Alias for getCandles (backwards compatibility)
   */
  async getMarketSnapshots(
    workspaceId: string,
    symbol: string,
    tf: '1m' | '5m' | '15m' | '1h' | '1D',
    from?: string,
    to?: string
  ) {
    return this.getCandles(workspaceId, symbol, tf, from, to);
  },

  // ========== ORDERS (READ/WRITE) ==========

  /**
   * Get orders for a workspace/run
   */
  async getOrders(workspaceId: string, runId?: string): Promise<any> {
    const baseQuery = (supabase.from('orders') as any)
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (runId) {
      return baseQuery
        .eq('run_id', runId)
        .order('ts_created', { ascending: false })
        .limit(100);
    }
    
    return baseQuery
      .order('ts_created', { ascending: false })
      .limit(100);
  },

  /**
   * Create order record via RPC (validated write)
   */
  async createOrder(payload: unknown) {
    const validated = OrderWrite.parse(payload);
    
    const { data, error } = await supabase.rpc('create_order_record', {
      _ws: validated.workspace_id,
      _run: validated.run_id ?? null,
      _symbol: validated.symbol,
      _side: validated.side,
      _qty: validated.qty,
      _limits: validated.limits ?? {},
      _validator_status: validated.validator_status,
      _broker_status: validated.broker_status,
    });
    
    if (error) throw error;
    return { data, error: null };
  },

  // ========== ORACLE SIGNALS (READ) ==========

  /**
   * Get oracle signals
   */
  async getOracleSignals(workspaceId: string, symbol?: string, limit: number = 50): Promise<any> {
    const baseQuery = (supabase.from('oracle_signals') as any)
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (symbol) {
      return baseQuery
        .eq('symbol', symbol)
        .order('ts', { ascending: false })
        .limit(limit);
    }
    
    return baseQuery
      .order('ts', { ascending: false })
      .limit(limit);
  },

  // ========== EVENT LOG (WRITE) ==========

  /**
   * Record event to event log (recorder_mirror)
   */
  async recordEvent(event: unknown) {
    const validated = EventRecord.parse(event);
    
    const { data, error } = await supabase
      .from('recorder_mirror')
      .insert([{
        workspace_id: validated.workspace_id,
        actor: validated.actor,
        event_type: validated.event_type,
        ref: validated.ref,
        payload: validated.payload as any,
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },

  // ========== PORTFOLIO & POSITIONS (READ) ==========

  /**
   * Get current portfolio snapshot
   */
  async getPortfolioSnapshot(workspaceId: string) {
    const [portfolio, positions] = await Promise.all([
      supabase
        .from('portfolio_current')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase
        .from('positions_current')
        .select('*')
        .eq('workspace_id', workspaceId)
    ]);
    
    return {
      data: {
        portfolio: portfolio.data,
        positions: positions.data || []
      },
      error: portfolio.error || positions.error
    };
  },

  // ========== RISK METRICS (READ) ==========

  /**
   * Get risk metrics history
   */
  async getRiskMetrics(workspaceId: string, limit: number = 30): Promise<any> {
    return (supabase.from('risk_counters') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('day', { ascending: false })
      .limit(limit);
  },
};
