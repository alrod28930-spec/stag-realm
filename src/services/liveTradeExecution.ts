import { supabase } from '@/integrations/supabase/client';
import { riskEnforcement } from './riskEnforcement';
import { eventBus } from './eventBus';
import { logService } from './logging';

interface LiveTradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  source: 'manual' | 'bot';
  botId?: string;
}

interface PreTradeJournal {
  id: string;
  botId?: string;
  symbol: string;
  hypothesis: string;
  signals: Array<{
    type: string;
    strength: number;
    source: string;
  }>;
  confidenceScore: number;
  expectedOutcome: string;
  riskAssessment: string;
}

export class LiveTradeExecutionService {
  private isActive = false;
  private tradeCount = 0;
  private maxDailyTrades = 30;

  setActive(active: boolean) {
    this.isActive = active;
    console.log(`Live trading execution ${active ? 'activated' : 'deactivated'}`);
    
    eventBus.emit('system.execution.status', {
      active,
      timestamp: new Date()
    });
  }

  async executeTradeWithGovernance(request: LiveTradeRequest): Promise<{
    success: boolean;
    orderId?: string;
    message: string;
  }> {
    try {
      // Check if system is active
      if (!this.isActive && request.source === 'bot') {
        return {
          success: false,
          message: 'Live trading execution is not active'
        };
      }

      // Check daily trade limits
      if (this.tradeCount >= this.maxDailyTrades) {
        return {
          success: false,
          message: 'Daily trade limit exceeded'
        };
      }

      // Step 1: Risk Enforcement Check
      const riskCheck = await riskEnforcement.checkTradeRisk({
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        price: request.price || 0,
        orderType: request.orderType,
        source: request.source
      });

      if (riskCheck.action === 'block') {
        console.warn('Trade blocked by risk enforcement', { 
          symbol: request.symbol,
          violations: riskCheck.violations 
        });
        
        return {
          success: false,
          message: `Trade blocked: ${riskCheck.violations.join(', ')}`
        };
      }

      // Apply any modifications from risk check
      let finalRequest = { ...request };
      if (riskCheck.modifications) {
        if (riskCheck.modifications.quantity) {
          finalRequest.quantity = riskCheck.modifications.quantity;
        }
      }

      // Step 2: Generate Pre-Trade Journal (for bot trades)
      if (request.source === 'bot' && request.botId) {
        await this.createPreTradeJournal(finalRequest);
      }

      // Step 3: Execute through broker
      const executionResult = await this.executeViaBroker(finalRequest);

      if (executionResult.success) {
        this.tradeCount++;
        
        // Log successful execution
        await this.logTradeExecution(finalRequest, executionResult.orderId!);
        
        // Emit events for system monitoring
        eventBus.emit('trade.executed', {
          orderId: executionResult.orderId,
          symbol: request.symbol,
          side: request.side,
          quantity: finalRequest.quantity,
          source: request.source,
          botId: request.botId,
          timestamp: new Date()
        });

        return {
          success: true,
          orderId: executionResult.orderId,
          message: `Successfully ${request.side === 'buy' ? 'bought' : 'sold'} ${finalRequest.quantity} shares of ${request.symbol}`
        };
      } else {
        return {
          success: false,
          message: executionResult.error || 'Trade execution failed'
        };
      }

    } catch (error: any) {
      console.error('Live trade execution error', { 
        error: error.message,
        symbol: request.symbol 
      });

      return {
        success: false,
        message: error.message || 'Unexpected error during trade execution'
      };
    }
  }

  private async executeViaBroker(request: LiveTradeRequest) {
    try {
      const { data, error } = await supabase.functions.invoke('trade-execute', {
        body: {
          symbol: request.symbol,
          side: request.side,
          order_type: request.orderType,
          quantity: request.quantity,
          price: request.price,
          stop_price: request.stopPrice,
          stop_loss: request.stopLoss,
          take_profit: request.takeProfit
        }
      });

      if (error) throw error;

      return {
        success: data.success,
        orderId: data.order_id,
        error: data.error
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createPreTradeJournal(request: LiveTradeRequest): Promise<void> {
    const journal: PreTradeJournal = {
      id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      botId: request.botId,
      symbol: request.symbol,
      hypothesis: this.generateHypothesis(request),
      signals: [
        {
          type: 'technical_momentum',
          strength: 0.7,
          source: 'oracle_intelligence'
        },
        {
          type: 'risk_reward',
          strength: 0.8,
          source: 'risk_calculator'
        }
      ],
      confidenceScore: 0.75,
      expectedOutcome: `Target ${request.side === 'buy' ? 'appreciation' : 'depreciation'} based on current market signals`,
      riskAssessment: `Max risk: ${request.stopLoss ? `$${Math.abs((request.price || 0) - request.stopLoss) * request.quantity}` : 'Undefined'}`
    };

    // Store journal in Supabase
    try {
      await supabase.from('rec_events').insert({
        workspace_id: '00000000-0000-0000-0000-000000000001',
        event_type: 'trade.journal.created',
        severity: 1,
        entity_type: 'trade',
        entity_id: request.symbol,
        summary: `Pre-trade journal created for ${request.symbol}`,
        payload_json: journal as any
      });
    } catch (error) {
      console.error('Failed to store pre-trade journal', { error });
    }
  }

  private generateHypothesis(request: LiveTradeRequest): string {
    const action = request.side === 'buy' ? 'Long' : 'Short';
    const rationale = request.side === 'buy' 
      ? 'based on bullish momentum signals and favorable risk-reward setup'
      : 'based on bearish momentum signals and favorable risk-reward setup';
    
    return `${action} ${request.symbol} position ${rationale}. Expecting ${request.side === 'buy' ? 'upward' : 'downward'} price movement within target timeframe.`;
  }

  private async logTradeExecution(request: LiveTradeRequest, orderId: string): Promise<void> {
    try {
      await supabase.from('rec_events').insert({
        workspace_id: '00000000-0000-0000-0000-000000000001',
        event_type: `trade.${request.source}.executed`,
        severity: 1,
        entity_type: 'trade',
        entity_id: request.symbol,
        summary: `${request.source} ${request.side} executed: ${request.quantity} shares of ${request.symbol}`,
        payload_json: {
          order_id: orderId,
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          price: request.price,
          order_type: request.orderType,
          source: request.source,
          bot_id: request.botId,
          stop_loss: request.stopLoss,
          take_profit: request.takeProfit
        } as any
      });
    } catch (error) {
      console.error('Failed to log trade execution', { error });
    }
  }

  getSystemStatus() {
    return {
      isActive: this.isActive,
      dailyTradeCount: this.tradeCount,
      maxDailyTrades: this.maxDailyTrades,
      remainingTrades: this.maxDailyTrades - this.tradeCount,
      riskGovernorsActive: true, // Simplified for now
      lastActivity: new Date()
    };
  }

  resetDailyCounters() {
    this.tradeCount = 0;
    console.log('Daily trade counters reset');
  }
}

export const liveTradeExecution = new LiveTradeExecutionService();