import { z } from 'zod';
import { supabase } from './client';

// ============================================================================
// BID Adapter - Backend-first data layer (single source of truth)
// ============================================================================

const CandleRecord = z.object({
  workspace_id: z.string().uuid(),
  symbol: z.string().regex(/^[A-Z.]{1,10}$/),
  tf: z.enum(['1m', '5m', '15m', '1h', '1D']),
  ts: z.string(), // ISO timestamp
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().optional(),
  vwap: z.number().optional(),
});

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

const OracleSignalWrite = z.object({
  workspace_id: z.string().uuid(),
  symbol: z.string().regex(/^[A-Z.]{1,10}$/),
  tf: z.enum(['1m', '5m', '15m', '1h', '1D']),
  ts: z.string(), // ISO timestamp
  name: z.string(), // 'ema_cross', 'rsi', 'breakout', etc.
  value: z.number().optional(), // numeric strength/value
  payload: z.record(z.unknown()).optional(), // extra fields
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
  async getMarketSnapshots(
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

    if (error) {
      console.error('❌ [BID] getMarketSnapshots error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  /**
   * Store candle data (for market-data-sync edge function)
   */
  async storeCandle(candle: unknown) {
    const validated = CandleRecord.parse(candle);
    
    const { error } = await supabase
      .from('candles')
      .upsert([validated as any]);
    
    if (error) throw error;
    return { data: validated, error: null };
  },

  // ========== ORDERS (READ/WRITE) ==========

  /**
   * Get orders for a workspace/run
   */
  async getOrders(workspaceId: string, runId?: string) {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('ts_created', { ascending: false })
      .limit(100) as any;
    
    if (runId) {
      query = query.eq('run_id', runId);
    }
    
    return query;
  },

  /**
   * Create order record (validated write)
   */
  async saveOrder(record: unknown) {
    const validated = OrderWrite.parse(record);
    
    // Direct insert (types will be generated after migration completes)
    const { data, error } = await (supabase
      .from('orders') as any)
      .insert([{
        workspace_id: validated.workspace_id,
        run_id: validated.run_id ?? null,
        symbol: validated.symbol,
        side: validated.side,
        qty: validated.qty,
        price: validated.price ?? null,
        limits: validated.limits ?? {},
        validator_status: validated.validator_status,
        validator_reason: validated.validator_reason ?? null,
        broker_status: validated.broker_status,
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },

  // ========== ORACLE SIGNALS (READ/WRITE) ==========

  /**
   * Store oracle signal (new schema: workspace_id, symbol, tf, ts, name, value, payload)
   */
  async storeOracleSignal(signal: unknown) {
    const validated = OracleSignalWrite.parse(signal);
    
    const { data, error } = await (supabase
      .from('oracle_signals') as any)
      .upsert([{
        workspace_id: validated.workspace_id,
        symbol: validated.symbol,
        tf: validated.tf,
        ts: validated.ts,
        name: validated.name,
        value: validated.value ?? null,
        payload: (validated.payload ?? {}) as any,
      }], {
        onConflict: 'workspace_id,symbol,tf,ts,name',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },

  /**
   * Get oracle signals
   */
  async getOracleSignals(workspaceId: string, symbol?: string, limit: number = 50) {
    let query = supabase
      .from('oracle_signals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('ts', { ascending: false })
      .limit(limit);
    
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    
    return query;
  },

  // ========== SUMMARIES / METADATA (READ/WRITE) ==========

  /**
   * Save summary/metadata (generic write for various data types)
   */
  async saveSummary(summary: unknown) {
    // Implementation depends on what summaries you need
    // For now, log to recorder
    return this.recordEvent({
      workspace_id: (summary as any).workspace_id,
      actor: 'system',
      event_type: 'summary.saved',
      payload: summary,
    });
  },

  // ========== EVENT LOG (WRITE) ==========

  /**
   * Record event to event log (mirrors to rec_events -> recorder_mirror view)
   */
  async recordEvent(event: unknown) {
    const validated = EventRecord.parse(event);
    
    const { data, error } = await supabase
      .from('rec_events')
      .insert([{
        workspace_id: validated.workspace_id,
        entity_type: validated.actor,
        event_type: validated.event_type,
        entity_id: validated.ref,
        payload_json: validated.payload as any,
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
  async getRiskMetrics(workspaceId: string, limit: number = 30) {
    return supabase
      .from('risk_counters')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('day', { ascending: false })
      .limit(limit);
  },

  // ========== TRADE VALIDATION (SERVER-SIDE) ==========

  /**
   * Validate trade via risk governor (server-side check)
   */
  async validateTrade(
    workspaceId: string,
    trade: {
      symbol: string;
      side: 'buy' | 'sell';
      qty: number;
      price?: number;
    }
  ) {
    // Call risk-governor edge function
    const { data, error } = await supabase.functions.invoke('risk-governor', {
      body: {
        workspace_id: workspaceId,
        order: trade,
      },
    });
    
    if (error) {
      return {
        valid: false,
        reason: error.message || 'Validation failed',
        modifications: null,
      };
    }
    
    return data;
  },
};
