// TODO: Replace with actual Supabase client import when available
// import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client for demo purposes
const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'demo-user' } } })
  },
  from: (table: string) => ({
    insert: (data: any) => Promise.resolve({ data: null, error: null }),
    select: (fields?: string, options?: any) => ({
      eq: (field: string, value: any) => ({
        order: (field: string, options?: any) => ({
          gte: (field: string, value: any) => ({
            lte: (field: string, value: any) => ({
              in: (field: string, values: any[]) => ({
                or: (condition: string) => ({
                  range: (start: number, end: number) => Promise.resolve({ data: [], error: null, count: 0 })
                })
              })
            })
          })
        })
      }),
      single: () => Promise.resolve({ data: { id: 'demo-export' }, error: null })
    }),
    update: (data: any) => ({
      eq: (field: string, value: any) => Promise.resolve({ data: null, error: null })
    })
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

      const result = supabase
        .from('rec_events')
        .insert({
          ...event,
          user_id: user.user.id,
          severity: event.severity || 1
        });

      if (result.error) {
        console.error('Failed to log event:', result.error);
      }
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  async getEvents(filters: RecorderFilters = {}): Promise<{ data: RecorderEvent[]; count: number }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { data: [], count: 0 };

      let query = supabase
        .from('rec_events')
        .select('*', { count: 'exact' })
        .eq('user_id', user.user.id)
        .order('ts', { ascending: false });

      // Apply filters
      if (filters.from) {
        query = query.gte('ts', filters.from);
      }
      if (filters.to) {
        query = query.lte('ts', filters.to);
      }
      if (filters.event_type?.length) {
        query = query.in('event_type', filters.event_type);
      }
      if (filters.severity?.length) {
        query = query.in('severity', filters.severity);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters.text) {
        query = query.or(`summary.ilike.%${filters.text}%,payload_json::text.ilike.%${filters.text}%`);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch events:', error);
        return { data: [], count: 0 };
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { data: [], count: 0 };
    }
  }

  async exportData(format: 'csv' | 'pdf', range_start: string, range_end: string): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Insert export record
      const { data: exportRecord, error } = await supabase
        .from('rec_exports')
        .insert({
          user_id: user.user.id,
          range_start,
          range_end,
          format,
          status: 'processing'
        })
        .select()
        .single();

      if (error || !exportRecord) {
        console.error('Failed to create export record:', error);
        return null;
      }

      // Generate export based on format
      if (format === 'csv') {
        return await this.generateCSV(range_start, range_end, exportRecord.id);
      } else {
        return await this.generatePDF(range_start, range_end, exportRecord.id);
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

      const { data, error } = await supabase
        .from('rec_exports')
        .select('*')
        .eq('user_id', user.user.id)
        .order('ts', { ascending: false });

      if (error) {
        console.error('Failed to fetch exports:', error);
        return [];
      }

      return data || [];
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

    // Update export record
    await supabase
      .from('rec_exports')
      .update({ status: 'completed', file_url: url })
      .eq('id', exportId);

    return url;
  }

  private async generatePDF(range_start: string, range_end: string, exportId: string): Promise<string> {
    // For now, return a placeholder PDF URL
    // In a real implementation, you'd generate a proper PDF
    const pdfContent = `StagAlgo Monthly Report\nPeriod: ${range_start} to ${range_end}\n\nGenerated by StagAlgo for educational purposes. Not financial advice.`;
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    await supabase
      .from('rec_exports')
      .update({ status: 'completed', file_url: url })
      .eq('id', exportId);

    return url;
  }

  private getWorkspaceId(): string {
    // For now, use a default workspace ID
    // In a real implementation, this would come from user context
    return 'default-workspace';
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