// TODO: Replace with actual Supabase client import when available
// import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client for demo purposes
const createQueryBuilder = () => {
  const builder: any = {
    eq: (field: string, value: any) => builder,
    order: (field: string, options?: any) => builder,
    gte: (field: string, value: any) => builder,
    lte: (field: string, value: any) => builder,
    in: (field: string, values: any[]) => builder,
    or: (condition: string) => builder,
    range: (start: number, end: number) => builder,
    single: () => Promise.resolve({ data: { id: 'demo-export' }, error: null }),
    then: (resolve: (value: any) => any) => {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
    }
  };
  return builder;
};

const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'demo-user' } } })
  },
  from: (table: string) => ({
    insert: (data: any) => ({
      select: () => createQueryBuilder(),
      then: (resolve: (value: any) => any) => {
        return Promise.resolve({ data: { id: 'demo-record' }, error: null }).then(resolve);
      }
    }),
    select: (fields?: string, options?: any) => createQueryBuilder(),
    update: (data: any) => createQueryBuilder()
  })
};
import { eventBus } from "./eventBus";

export interface RecorderEvent {
  id?: string;
  ts?: string;
  workspace_id: string;
  user_id?: string;
  event_type: string;
  severity?: number; // 1=info, 2=warn, 3=high, 4=critical
  entity_type?: string;
  entity_id?: string;
  summary: string;
  payload_json?: Record<string, any>;
}

export interface RecorderExport {
  id?: string;
  ts?: string;
  user_id?: string;
  range_start: string;
  range_end: string;
  format: 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
}

export interface RecorderFilters {
  from?: string;
  to?: string;
  event_type?: string[];
  severity?: number[];
  entity_type?: string;
  entity_id?: string;
  text?: string;
  page?: number;
  limit?: number;
}

class RecorderService {
  private initialized = false;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    if (this.initialized) return;
    
    // Subscribe to various event types
    const eventTypes = [
      'trade.intent', 'trade.executed', 'trade.canceled',
      'risk.soft_pull', 'risk.hard_pull', 'risk.toggle.changed',
      'oracle.signal.created', 'search.requested', 'recommendation.shown',
      'analyst.note', 'alert.created', 'disclaimer.accepted',
      'bot.state.changed', 'settings.updated', 'subscription.updated'
    ];

    eventTypes.forEach(eventType => {
      eventBus.on(eventType, (data: any) => {
        this.log({
          workspace_id: this.getWorkspaceId(),
          event_type: eventType,
          summary: this.generateSummary(eventType, data),
          payload_json: data,
          severity: this.getSeverityForEventType(eventType),
          entity_type: this.extractEntityType(eventType),
          entity_id: data?.id || data?.entity_id
        });
      });
    });

    this.initialized = true;
  }

  async log(event: RecorderEvent): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // For demo purposes, just log the event without actual database storage
      console.log('Recording event:', event);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  async getEvents(filters: RecorderFilters = {}): Promise<{ data: RecorderEvent[]; count: number }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { data: [], count: 0 };

      // For demo purposes, return mock data
      const mockEvents: RecorderEvent[] = [
        {
          id: 'event_demo1',
          ts: new Date().toISOString(),
          workspace_id: 'demo-workspace',
          user_id: user.user.id,
          event_type: 'trade.executed',
          severity: 2,
          entity_type: 'trade',
          entity_id: 'trade_123',
          summary: 'Trade executed: AAPL 100 shares',
          payload_json: { symbol: 'AAPL', quantity: 100, price: 150.25 }
        },
        {
          id: 'event_demo2',
          ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          workspace_id: 'demo-workspace',
          user_id: user.user.id,
          event_type: 'risk.soft_pull',
          severity: 3,
          entity_type: 'risk',
          entity_id: 'risk_456',
          summary: 'Risk soft pull: Position size exceeded',
          payload_json: { reason: 'Position size exceeded', threshold: 0.05 }
        },
        {
          id: 'event_demo3',
          ts: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          workspace_id: 'demo-workspace',
          user_id: user.user.id,
          event_type: 'oracle.signal.created',
          severity: 2,
          entity_type: 'oracle',
          entity_id: 'signal_789',
          summary: 'Oracle signal: BULLISH for TSLA',
          payload_json: { signal_type: 'BULLISH', symbol: 'TSLA', confidence: 0.85 }
        }
      ];

      return { data: mockEvents, count: mockEvents.length };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { data: [], count: 0 };
    }
  }

  async exportData(format: 'csv' | 'pdf', range_start: string, range_end: string): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // For demo purposes, generate mock exports
      if (format === 'csv') {
        return await this.generateCSV(range_start, range_end, 'demo_export_csv');
      } else {
        return await this.generatePDF(range_start, range_end, 'demo_export_pdf');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  async getExports(): Promise<RecorderExport[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // For demo purposes, return mock export history
      const mockExports: RecorderExport[] = [
        {
          id: 'export_demo1',
          ts: new Date().toISOString(),
          user_id: user.user.id,
          range_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          range_end: new Date().toISOString(),
          format: 'csv',
          status: 'completed',
          file_url: '#'
        },
        {
          id: 'export_demo2',
          ts: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user_id: user.user.id,
          range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          range_end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          format: 'pdf',
          status: 'completed',
          file_url: '#'
        }
      ];

      return mockExports;
    } catch (error) {
      console.error('Error fetching exports:', error);
      return [];
    }
  }

  private async generateCSV(range_start: string, range_end: string, exportId: string): Promise<string> {
    const { data: events } = await this.getEvents({
      from: range_start,
      to: range_end,
      limit: 10000 // Large limit for export
    });

    const headers = ['timestamp', 'event_type', 'severity', 'entity_type', 'entity_id', 'summary', 'payload_json'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        event.ts,
        event.event_type,
        event.severity,
        event.entity_type || '',
        event.entity_id || '',
        `"${event.summary.replace(/"/g, '""')}"`,
        `"${JSON.stringify(event.payload_json || {}).replace(/"/g, '""')}"`
      ].join(',')),
      '',
      '"Generated by StagAlgo for educational purposes. Not financial advice."'
    ].join('\n');

    // Create blob and URL
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    return url;
  }

  private async generatePDF(range_start: string, range_end: string, exportId: string): Promise<string> {
    // For now, return a placeholder PDF URL
    // In a real implementation, you'd generate a proper PDF
    const pdfContent = `StagAlgo Monthly Report\nPeriod: ${range_start} to ${range_end}\n\nGenerated by StagAlgo for educational purposes. Not financial advice.`;
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    return url;
  }

  private getWorkspaceId(): string {
    // For now, use a default workspace ID
    // In a real implementation, this would come from user context
    return '00000000-0000-0000-0000-000000000001';
  }

  private generateSummary(eventType: string, data: any): string {
    switch (eventType) {
      case 'trade.intent':
        return `Trade intent: ${data?.symbol || 'Unknown'} ${data?.side || 'Unknown'}`;
      case 'trade.executed':
        return `Trade executed: ${data?.symbol || 'Unknown'} ${data?.quantity || 'Unknown'} shares`;
      case 'risk.soft_pull':
        return `Risk soft pull: ${data?.reason || 'Unknown reason'}`;
      case 'risk.hard_pull':
        return `Risk hard pull: ${data?.reason || 'Unknown reason'}`;
      case 'oracle.signal.created':
        return `Oracle signal: ${data?.signal_type || 'Unknown'} for ${data?.symbol || 'Unknown'}`;
      case 'analyst.note':
        return `Analyst note: ${data?.topic || 'General note'}`;
      case 'alert.created':
        return `Alert created: ${data?.message || 'Unknown alert'}`;
      case 'disclaimer.accepted':
        return `Disclaimer accepted: ${data?.type || 'General'}`;
      case 'bot.state.changed':
        return `Bot ${data?.bot_id || 'Unknown'} changed from ${data?.from || 'Unknown'} to ${data?.to || 'Unknown'}`;
      case 'subscription.updated':
        return `Subscription updated: ${data?.plan || 'Unknown plan'}`;
      default:
        return `${eventType}: ${JSON.stringify(data).substring(0, 100)}`;
    }
  }

  private getSeverityForEventType(eventType: string): number {
    switch (eventType) {
      case 'risk.hard_pull':
      case 'trade.canceled':
        return 4; // critical
      case 'risk.soft_pull':
      case 'alert.created':
        return 3; // high
      case 'trade.executed':
      case 'oracle.signal.created':
        return 2; // warn
      default:
        return 1; // info
    }
  }

  private extractEntityType(eventType: string): string {
    const parts = eventType.split('.');
    return parts[0] || 'system';
  }
}

export const recorderService = new RecorderService();