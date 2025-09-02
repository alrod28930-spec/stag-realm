import { supabase } from '@/integrations/supabase/client';
import type { UserSettings, UserOverride, BrokerageConnection } from '@/types/userSettings';
import { createLogger } from './logging';

const logger = createLogger('UserSettings');

export class UserSettingsService {
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data as UserSettings;
    } catch (error) {
      logger.error('Failed to get user settings', { userId, error });
      return null;
    }
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ...updates
        });

      if (error) throw error;
      
      logger.info('User settings updated', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to update user settings', { userId, error });
      return false;
    }
  }

  async getUserOverrides(workspaceId: string, userId: string): Promise<UserOverride[]> {
    try {
      const { data, error } = await supabase
        .from('user_overrides')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
      
      return (data || []) as UserOverride[];
    } catch (error) {
      logger.error('Failed to get user overrides', { workspaceId, userId, error });
      return [];
    }
  }

  async setUserOverride(workspaceId: string, userId: string, key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_overrides')
        .upsert({
          workspace_id: workspaceId,
          user_id: userId,
          key,
          value
        });

      if (error) throw error;
      
      logger.info('User override set', { workspaceId, userId, key });
      return true;
    } catch (error) {
      logger.error('Failed to set user override', { workspaceId, userId, key, error });
      return false;
    }
  }

  async getBrokerageConnections(workspaceId: string): Promise<BrokerageConnection[]> {
    try {
      const { data, error } = await supabase
        .from('connections_brokerages')
        .select('id, workspace_id, provider, account_label, scope, status, last_sync, created_at, updated_at')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      
      return (data || []) as BrokerageConnection[];
    } catch (error) {
      logger.error('Failed to get brokerage connections', { workspaceId, error });
      return [];
    }
  }

  async recordCompliance(
    userId: string, 
    documentType: string, 
    version: string, 
    workspaceId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('compliance_acknowledgments')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          document_type: documentType,
          version: version,
          acknowledged_at: new Date().toISOString()
        });

      if (error) throw error;
      
      logger.info('Compliance recorded', { userId, documentType, version });
      return true;
    } catch (error) {
      logger.error('Failed to record compliance', { userId, documentType, error });
      return false;
    }
  }
}

export const userSettingsService = new UserSettingsService();