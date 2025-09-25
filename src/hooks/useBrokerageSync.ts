import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrokerageSyncResult {
  success: boolean;
  message: string;
  results?: Array<{
    connection_id: string;
    provider: string;
    account_label: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

export function useBrokerageSync() {
  const { toast } = useToast();

  const triggerSync = useCallback(async (workspaceId: string, connectionId?: string) => {
    try {
      console.log('Triggering brokerage sync for workspace:', workspaceId, 'connection:', connectionId);

      const { data, error } = await supabase.functions.invoke('brokerage-sync', {
        body: {
          workspace_id: workspaceId,
          connection_id: connectionId
        }
      });

      if (error) {
        console.error('Brokerage sync error:', error);
        toast({
          title: "Sync Failed",
          description: "Failed to sync with brokerage account. Please try again.",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      const result = data as BrokerageSyncResult;
      
      if (result.success) {
        const successCount = result.results?.filter(r => r.success).length || 0;
        toast({
          title: "Sync Successful",
          description: `Successfully synced ${successCount} brokerage account(s)`,
        });
      } else {
        toast({
          title: "Sync Issues",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;

    } catch (error) {
      console.error('Sync trigger error:', error);
      toast({
        title: "Sync Error",
        description: "Unable to connect to sync service",
        variant: "destructive",
      });
      return { success: false, error: 'Unable to connect to sync service' };
    }
  }, [toast]);

  const autoSyncAfterConnection = useCallback(async (workspaceId: string, connectionId: string) => {
    // Add a small delay to ensure the connection is fully saved
    setTimeout(async () => {
      console.log('Auto-syncing after new connection:', connectionId);
      await triggerSync(workspaceId, connectionId);
    }, 2000);
  }, [triggerSync]);

  return {
    triggerSync,
    autoSyncAfterConnection
  };
}