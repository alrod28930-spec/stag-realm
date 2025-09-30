/**
 * BID Adapter - Base Intelligence Database
 * Backend-first adapter ensuring Supabase is the single source of truth
 * All writes go through validation before reaching the database
 */

import { supabase } from './client';
import { eventBus } from '@/services/eventBus';
import { logService } from '@/services/logging';
import {
  OrderRecordSchema,
  MarketSnapshotSchema,
  OracleSignalSchema,
  RecorderEventSchema,
  SummarySchema,
  validateSchema,
  type OrderRecord,
  type MarketSnapshot,
  type OracleSignal,
  type RecorderEvent,
  type Summary,
} from '@/schemas';

// ============================================================================
// BID ADAPTER CLASS
// ============================================================================

export class BIDAdapter {
  /**
   * Get market snapshots (candles) for a symbol
   */
  async getMarketSnapshots(
    workspaceId: string,
    symbol: string,
    tf: string,
    from?: string,
    to?: string
  ) {
    try {
      let query = supabase
        .from('candles')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('symbol', symbol)
        .eq('tf', tf)
        .order('ts', { ascending: false });

      if (from) query = query.gte('ts', from);
      if (to) query = query.lte('ts', to);

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to fetch market snapshots', { error, symbol, tf });
      return { data: null, error };
    }
  }

  /**
   * Save order with validation
   */
  async saveOrder(record: unknown) {
    const validation = validateSchema(OrderRecordSchema, record, 'BID.saveOrder');
    
    if (!validation.success) {
      await this.recordEvent({
        workspace_id: (record as any).workspace_id || 'unknown',
        event_type: 'validation.order.failed',
        severity: 2,
        entity_type: 'order',
        summary: 'Order validation failed',
        payload_json: { errors: validation.errors }
      });
      
      logService.log('error', 'Order schema validation failed', validation.errors);
      return { data: null, error: new Error('Order validation failed') };
    }

    try {
      // Add timestamps if not present
      const orderData = {
        ...validation.data!,
        ts_created: validation.data!.ts_created || new Date().toISOString(),
        ts_updated: validation.data!.ts_updated || new Date().toISOString(),
      };

      // Note: This would insert into an 'orders' table - currently not in schema
      // For now, we'll record as an event
      await this.recordEvent({
        workspace_id: orderData.workspace_id,
        event_type: 'order.recorded',
        severity: 1,
        entity_type: 'order',
        entity_id: orderData.order_id,
        summary: `${orderData.side} ${orderData.qty} ${orderData.symbol}`,
        payload_json: orderData as any
      });

      eventBus.emit('bid.order_saved', orderData);
      return { data: orderData, error: null };
    } catch (error) {
      logService.log('error', 'Failed to save order', { error, record: validation.data });
      return { data: null, error };
    }
  }

  /**
   * Get orders for workspace
   */
  async getOrders(workspaceId: string, runId?: string) {
    try {
      // Fetch from rec_events where entity_type = 'order'
      let query = supabase
        .from('rec_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', 'order')
        .order('ts', { ascending: false });

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Transform events back to order format
      const orders = data?.map(event => {
        const payload = event.payload_json && typeof event.payload_json === 'object' ? event.payload_json : {};
        return {
          ...(payload as Record<string, any>),
          event_id: event.id,
          ts: event.ts
        };
      }) || [];

      return { data: orders, error: null };
    } catch (error) {
      logService.log('error', 'Failed to fetch orders', { error, workspaceId });
      return { data: null, error };
    }
  }

  /**
   * Store candle data
   */
  async storeCandle(candle: unknown) {
    const validation = validateSchema(MarketSnapshotSchema, candle, 'BID.storeCandle');
    
    if (!validation.success) {
      logService.log('error', 'Candle validation failed', validation.errors);
      return { data: null, error: new Error('Candle validation failed') };
    }

    try {
      const { data, error } = await supabase
        .from('candles')
        .upsert([validation.data as any], {
          onConflict: 'workspace_id,symbol,tf,ts'
        });

      if (error) throw error;

      eventBus.emit('bid.candle_stored', validation.data);
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to store candle', { error, candle: validation.data });
      return { data: null, error };
    }
  }

  /**
   * Store Oracle signal
   */
  async storeOracleSignal(signal: unknown) {
    const validation = validateSchema(OracleSignalSchema, signal, 'BID.storeOracleSignal');
    
    if (!validation.success) {
      logService.log('error', 'Oracle signal validation failed', validation.errors);
      return { data: null, error: new Error('Signal validation failed') };
    }

    try {
      const signalData = {
        ...validation.data!,
        ts: validation.data!.ts || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('oracle_signals')
        .insert([signalData as any]);

      if (error) throw error;

      eventBus.emit('bid.oracle_signal_stored', signalData);
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to store oracle signal', { error, signal: validation.data });
      return { data: null, error };
    }
  }

  /**
   * Get Oracle signals
   */
  async getOracleSignals(workspaceId: string, symbol?: string, limit = 50) {
    try {
      let query = supabase
        .from('oracle_signals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('ts', { ascending: false })
        .limit(limit);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to fetch oracle signals', { error, workspaceId });
      return { data: null, error };
    }
  }

  /**
   * Save summary
   */
  async saveSummary(summary: unknown) {
    const validation = validateSchema(SummarySchema, summary, 'BID.saveSummary');
    
    if (!validation.success) {
      logService.log('error', 'Summary validation failed', validation.errors);
      return { data: null, error: new Error('Summary validation failed') };
    }

    try {
      const summaryData = {
        ...validation.data!,
        ts: validation.data!.ts || new Date().toISOString(),
      };

      // Store as recorder event for now
      await this.recordEvent({
        workspace_id: summaryData.workspace_id,
        event_type: 'summary.created',
        severity: 1,
        entity_type: 'summary',
        summary: summaryData.text,
        payload_json: summaryData as any
      });

      return { data: summaryData, error: null };
    } catch (error) {
      logService.log('error', 'Failed to save summary', { error, summary: validation.data });
      return { data: null, error };
    }
  }

  /**
   * Record event to rec_events (append-only log)
   */
  async recordEvent(event: unknown) {
    const validation = validateSchema(RecorderEventSchema, event, 'BID.recordEvent');
    
    if (!validation.success) {
      logService.log('error', 'Event validation failed', validation.errors);
      return { data: null, error: new Error('Event validation failed') };
    }

    try {
      const eventData = {
        ...validation.data!,
        ts: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('rec_events')
        .insert([eventData as any]);

      if (error) throw error;

      eventBus.emit('bid.event_recorded', eventData);
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to record event', { error, event: validation.data });
      return { data: null, error };
    }
  }

  /**
   * Get portfolio snapshot
   */
  async getPortfolioSnapshot(workspaceId: string) {
    try {
      // Get portfolio summary
      const { data: portfolio, error: portfolioError } = await supabase
        .from('positions_current')
        .select('workspace_id, equity, cash, updated_at')
        .eq('workspace_id', workspaceId)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        throw portfolioError;
      }

      // Get positions
      const { data: positions, error: positionsError } = await supabase
        .from('positions_current')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (positionsError) throw positionsError;

      return {
        data: {
          portfolio: portfolio || null,
          positions: positions || []
        },
        error: null
      };
    } catch (error) {
      logService.log('error', 'Failed to fetch portfolio snapshot', { error, workspaceId });
      return { data: null, error };
    }
  }

  /**
   * Get risk metrics
   */
  async getRiskMetrics(workspaceId: string, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('risk_portfolio')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('ts', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logService.log('error', 'Failed to fetch risk metrics', { error, workspaceId });
      return { data: null, error };
    }
  }

  /**
   * Validate trade before execution (risk checks)
   */
  async validateTrade(
    workspaceId: string,
    trade: { symbol: string; side: 'buy' | 'sell'; qty: number; price?: number }
  ) {
    try {
      // Get current portfolio
      const { data: portfolioData } = await this.getPortfolioSnapshot(workspaceId);
      
      if (!portfolioData?.portfolio) {
        return {
          valid: false,
          reason: 'No portfolio data available',
          modifications: null
        };
      }

      // Get bot profile risk settings
      const { data: botProfile } = await supabase
        .from('bot_profiles')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (!botProfile) {
        return {
          valid: false,
          reason: 'No bot profile configured',
          modifications: null
        };
      }

      const equity = portfolioData.portfolio.equity || 0;
      const maxRisk = (botProfile.risk_per_trade_pct || 0.01) * equity;
      const tradeValue = trade.qty * (trade.price || 0);

      // Check if trade exceeds risk limits
      if (tradeValue > maxRisk) {
        const suggestedQty = Math.floor(maxRisk / (trade.price || 1));
        return {
          valid: false,
          reason: `Trade size ${tradeValue.toFixed(2)} exceeds max risk ${maxRisk.toFixed(2)}`,
          modifications: {
            suggested_qty: suggestedQty,
            reason: 'Reduced to comply with risk limits'
          }
        };
      }

      // Check blacklist
      const { data: blacklist } = await supabase
        .from('blacklists')
        .select('symbol, reason')
        .eq('workspace_id', workspaceId)
        .eq('symbol', trade.symbol)
        .single();

      if (blacklist) {
        return {
          valid: false,
          reason: `Symbol ${trade.symbol} is blacklisted: ${blacklist.reason}`,
          modifications: null
        };
      }

      return {
        valid: true,
        reason: 'Trade passed all validation checks',
        modifications: null
      };
    } catch (error) {
      logService.log('error', 'Trade validation failed', { error, trade });
      return {
        valid: false,
        reason: 'Validation error occurred',
        modifications: null
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const BID = new BIDAdapter();
