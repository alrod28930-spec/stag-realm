import { logService } from './logging';
import { eventBus } from './eventBus';

// Recorder - Immutable audit trail and export system
export interface RecorderEntry {
  id: string;
  timestamp: Date;
  entityType: 'trade' | 'alert' | 'analyst' | 'risk' | 'system' | 'user';
  entityId?: string;
  action: string;
  description: string;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
  version: string;
  hash: string; // For integrity verification
}

export interface TradeRecord extends RecorderEntry {
  entityType: 'trade';
  tradeIntent: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market' | 'limit' | 'stop';
    price?: number;
    stopPrice?: number;
  };
  governanceApproval?: {
    approved: boolean;
    approvedBy: 'monarch' | 'overseer' | 'user';
    reason?: string;
    timestamp: Date;
  };
  execution?: {
    orderId: string;
    status: 'pending' | 'filled' | 'cancelled' | 'rejected';
    fillPrice?: number;
    fillQuantity?: number;
    executedAt?: Date;
    brokerResponse: any;
  };
}

export interface AnalystRecord extends RecorderEntry {
  entityType: 'analyst';
  conversation: {
    userQuery: string;
    analystResponse: string;
    persona: string;
    citedSources: string[];
    chartsGenerated: string[];
    confidenceLevel: number;
  };
}

export interface RiskRecord extends RecorderEntry {
  entityType: 'risk';
  riskAction: {
    type: 'soft_pull' | 'hard_pull' | 'stop_loss_update' | 'take_profit_update' | 'blacklist_symbol';
    reason: string;
    affectedSymbols: string[];
    previousValues: Record<string, any>;
    newValues: Record<string, any>;
    triggeredBy: 'monarch' | 'overseer' | 'user';
  };
}

export interface AlertRecord extends RecorderEntry {
  entityType: 'alert';
  alert: {
    type: 'risk' | 'opportunity' | 'technical' | 'fundamental' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    symbol?: string;
    acknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
  };
}

export interface SystemRecord extends RecorderEntry {
  entityType: 'system';
  systemEvent: {
    type: 'startup' | 'shutdown' | 'broker_connect' | 'broker_disconnect' | 'feature_flag_change' | 'export';
    details: Record<string, any>;
    success: boolean;
    errorMessage?: string;
  };
}

export interface ExportSummary {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  format: 'csv' | 'pdf' | 'json';
  startDate: Date;
  endDate: Date;
  recordCount: number;
  fileSizeBytes: number;
  generatedAt: Date;
  downloadUrl?: string;
  metadata: Record<string, any>;
}

// Main Recorder class
export class Recorder {
  private entries: RecorderEntry[] = [];
  private exports: ExportSummary[] = [];
  private currentSessionId: string;
  private currentVersion: string = '1.0.0';

  constructor() {
    this.currentSessionId = this.generateSessionId();
    
    // Listen to all relevant events for recording
    this.initializeEventListeners();
    
    // Record system startup
    this.recordSystemEvent('startup', { sessionId: this.currentSessionId }, true);
  }

  private initializeEventListeners(): void {
    // Trade events
    eventBus.on('trade.intent', (data: any) => {
      this.recordTradeIntent(data);
    });
    
    eventBus.on('trade.governance_decision', (data: any) => {
      this.recordGovernanceDecision(data);
    });
    
    eventBus.on('trade.executed', (data: any) => {
      this.recordTradeExecution(data);
    });

    // Analyst events
    eventBus.on('analyst.conversation', (data: any) => {
      this.recordAnalystConversation(data);
    });

    // Risk events
    eventBus.on('risk.soft_pull', (data: any) => {
      this.recordRiskAction('soft_pull', data);
    });
    
    eventBus.on('risk.hard_pull', (data: any) => {
      this.recordRiskAction('hard_pull', data);
    });

    // Alert events
    eventBus.on('bid.alerts_generated', (alerts: any[]) => {
      alerts.forEach(alert => this.recordAlert(alert));
    });
    
    eventBus.on('bid.alert_acknowledged', (alert: any) => {
      this.recordAlertAcknowledgment(alert);
    });

    // System events
    eventBus.on('broker.connected', (data: any) => {
      this.recordSystemEvent('broker_connect', data, true);
    });
    
    eventBus.on('broker.disconnected', (data: any) => {
      this.recordSystemEvent('broker_disconnect', data, true);
    });
    
    eventBus.on('bid.feature_flag_updated', (data: any) => {
      this.recordSystemEvent('feature_flag_change', data, true);
    });
  }

  // Core recording method
  private createEntry(
    entityType: RecorderEntry['entityType'],
    action: string,
    description: string,
    data: Record<string, any>,
    entityId?: string
  ): RecorderEntry {
    const entry: RecorderEntry = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      entityType,
      entityId,
      action,
      description,
      data,
      sessionId: this.currentSessionId,
      version: this.currentVersion,
      hash: this.generateHash(data)
    };

    this.entries.unshift(entry);
    
    // Keep last 10,000 entries (about 6 months of heavy trading)
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(0, 10000);
    }

    logService.log('debug', 'Recorder entry created', { 
      id: entry.id, 
      entityType, 
      action 
    });

    return entry;
  }

  // Trade recording methods
  recordTradeIntent(data: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market' | 'limit' | 'stop';
    price?: number;
    stopPrice?: number;
    userId?: string;
  }): TradeRecord {
    const entry = this.createEntry(
      'trade',
      'intent',
      `Trade intent: ${data.side.toUpperCase()} ${data.quantity} ${data.symbol}`,
      data
    ) as TradeRecord;

    entry.tradeIntent = {
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      orderType: data.orderType,
      price: data.price,
      stopPrice: data.stopPrice
    };

    return entry;
  }

  recordGovernanceDecision(data: {
    tradeIntentId: string;
    approved: boolean;
    approvedBy: 'monarch' | 'overseer' | 'user';
    reason?: string;
  }): void {
    // Find the original trade intent
    const tradeEntry = this.entries.find(e => 
      e.id === data.tradeIntentId && e.entityType === 'trade'
    ) as TradeRecord;

    if (tradeEntry) {
      tradeEntry.governanceApproval = {
        approved: data.approved,
        approvedBy: data.approvedBy,
        reason: data.reason,
        timestamp: new Date()
      };

      // Also create a separate governance record
      this.createEntry(
        'risk',
        'governance_decision',
        `Trade ${data.approved ? 'approved' : 'rejected'} by ${data.approvedBy}`,
        data,
        data.tradeIntentId
      );
    }
  }

  recordTradeExecution(data: {
    tradeIntentId: string;
    orderId: string;
    status: 'pending' | 'filled' | 'cancelled' | 'rejected';
    fillPrice?: number;
    fillQuantity?: number;
    brokerResponse: any;
  }): void {
    // Find the original trade intent
    const tradeEntry = this.entries.find(e => 
      e.id === data.tradeIntentId && e.entityType === 'trade'
    ) as TradeRecord;

    if (tradeEntry) {
      tradeEntry.execution = {
        orderId: data.orderId,
        status: data.status,
        fillPrice: data.fillPrice,
        fillQuantity: data.fillQuantity,
        executedAt: new Date(),
        brokerResponse: data.brokerResponse
      };

      // Also create a separate execution record
      this.createEntry(
        'trade',
        'execution',
        `Trade executed: ${data.status} - ${data.orderId}`,
        data,
        data.tradeIntentId
      );
    }
  }

  // Analyst recording
  recordAnalystConversation(data: {
    userQuery: string;
    analystResponse: string;
    persona: string;
    citedSources: string[];
    chartsGenerated: string[];
    confidenceLevel: number;
    userId?: string;
  }): AnalystRecord {
    const entry = this.createEntry(
      'analyst',
      'conversation',
      `Analyst conversation: ${data.persona}`,
      data
    ) as AnalystRecord;

    entry.conversation = {
      userQuery: data.userQuery,
      analystResponse: data.analystResponse,
      persona: data.persona,
      citedSources: data.citedSources,
      chartsGenerated: data.chartsGenerated,
      confidenceLevel: data.confidenceLevel
    };

    return entry;
  }

  // Risk recording
  recordRiskAction(
    type: 'soft_pull' | 'hard_pull' | 'stop_loss_update' | 'take_profit_update' | 'blacklist_symbol',
    data: {
      reason: string;
      affectedSymbols: string[];
      previousValues: Record<string, any>;
      newValues: Record<string, any>;
      triggeredBy: 'monarch' | 'overseer' | 'user';
    }
  ): RiskRecord {
    const entry = this.createEntry(
      'risk',
      type,
      `Risk action: ${type} - ${data.reason}`,
      data
    ) as RiskRecord;

    entry.riskAction = {
      type,
      reason: data.reason,
      affectedSymbols: data.affectedSymbols,
      previousValues: data.previousValues,
      newValues: data.newValues,
      triggeredBy: data.triggeredBy
    };

    return entry;
  }

  // Alert recording
  recordAlert(alert: {
    id: string;
    type: 'risk' | 'opportunity' | 'technical' | 'fundamental' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    symbol?: string;
  }): AlertRecord {
    const entry = this.createEntry(
      'alert',
      'generated',
      `Alert: ${alert.title}`,
      alert,
      alert.id
    ) as AlertRecord;

    entry.alert = {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      symbol: alert.symbol,
      acknowledged: false
    };

    return entry;
  }

  recordAlertAcknowledgment(alert: { id: string; acknowledgedBy?: string }): void {
    this.createEntry(
      'alert',
      'acknowledged',
      `Alert acknowledged: ${alert.id}`,
      alert,
      alert.id
    );
  }

  // System recording
  recordSystemEvent(
    type: 'startup' | 'shutdown' | 'broker_connect' | 'broker_disconnect' | 'feature_flag_change' | 'export',
    details: Record<string, any>,
    success: boolean,
    errorMessage?: string
  ): SystemRecord {
    const entry = this.createEntry(
      'system',
      type,
      `System event: ${type} - ${success ? 'success' : 'failed'}`,
      { details, success, errorMessage }
    ) as SystemRecord;

    entry.systemEvent = {
      type,
      details,
      success,
      errorMessage
    };

    return entry;
  }

  // Query methods
  getEntries(
    filters: {
      entityType?: RecorderEntry['entityType'];
      startDate?: Date;
      endDate?: Date;
      entityId?: string;
      userId?: string;
      limit?: number;
    } = {}
  ): RecorderEntry[] {
    let filtered = this.entries;

    if (filters.entityType) {
      filtered = filtered.filter(e => e.entityType === filters.entityType);
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters.entityId) {
      filtered = filtered.filter(e => e.entityId === filters.entityId);
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    return filtered.slice(0, filters.limit || 100);
  }

  getTradeHistory(symbol?: string, days = 30): TradeRecord[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = this.getEntries({
      entityType: 'trade',
      startDate,
      limit: 1000
    }) as TradeRecord[];

    return symbol 
      ? entries.filter(e => e.tradeIntent?.symbol === symbol.toUpperCase())
      : entries;
  }

  getAnalystHistory(days = 7): AnalystRecord[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getEntries({
      entityType: 'analyst',
      startDate,
      limit: 100
    }) as AnalystRecord[];
  }

  // Export methods
  async exportToCSV(
    startDate: Date,
    endDate: Date,
    entityTypes?: RecorderEntry['entityType'][]
  ): Promise<ExportSummary> {
    const entries = this.getEntries({
      startDate,
      endDate,
      limit: 10000
    }).filter(e => !entityTypes || entityTypes.includes(e.entityType));

    // Generate CSV content
    const headers = ['timestamp', 'entityType', 'action', 'description', 'data'];
    const rows = entries.map(entry => [
      entry.timestamp.toISOString(),
      entry.entityType,
      entry.action,
      entry.description,
      JSON.stringify(entry.data)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `\"${cell}\"`).join(','))
      .join('\n');

    const summary: ExportSummary = {
      id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      format: 'csv',
      startDate,
      endDate,
      recordCount: entries.length,
      fileSizeBytes: csvContent.length,
      generatedAt: new Date(),
      metadata: { entityTypes: entityTypes || 'all' }
    };

    this.exports.unshift(summary);
    this.recordSystemEvent('export', summary, true);

    // In a real implementation, this would save to file system or cloud storage
    logService.log('info', 'CSV export generated', summary);

    return summary;
  }

  async exportMonthlyPDF(year: number, month: number): Promise<ExportSummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const entries = this.getEntries({ startDate, endDate, limit: 10000 });

    // Mock PDF generation
    const summary: ExportSummary = {
      id: `monthly_pdf_${year}_${month}`,
      type: 'monthly',
      format: 'pdf',
      startDate,
      endDate,
      recordCount: entries.length,
      fileSizeBytes: entries.length * 500, // Mock file size
      generatedAt: new Date(),
      metadata: { year, month, sections: ['trades', 'alerts', 'risk_actions', 'performance'] }
    };

    this.exports.unshift(summary);
    this.recordSystemEvent('export', summary, true);

    logService.log('info', 'Monthly PDF export generated', summary);

    return summary;
  }

  // Oracle-specific logging
  recordOracleSignal(signal: any) {
    this.createEntry(
      'system',
      'oracle_signal',
      `Oracle signal: ${signal.signal}`,
      {
        signalId: signal.id,
        type: signal.type,
        severity: signal.severity,
        symbol: signal.symbol,
        sector: signal.sector,
        confidence: signal.confidence,
        direction: signal.direction
      }
    );
  }

  recordOracleAlert(alert: any) {
    this.createEntry(
      'alert',
      'oracle_alert',
      `Oracle alert: ${alert.title}`,
      {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        affectedSymbols: alert.affectedSymbols,
        affectedSectors: alert.affectedSectors,
        actionRequired: alert.actionRequired,
        relatedSignals: alert.relatedSignals
      }
    );
  }

  // Get recent events for context
  getRecentEvents(limit: number = 20): RecorderEntry[] {
    return this.entries.slice(0, limit);
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHash(data: Record<string, any>): string {
    // Simple hash for integrity checking
    // In production, use proper cryptographic hash
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  getExportHistory(): ExportSummary[] {
    return this.exports;
  }

  getRecordCount(): number {
    return this.entries.length;
  }

  getSessionId(): string {
    return this.currentSessionId;
  }
}

// Export singleton instance
export const recorder = new Recorder();
