// Workspace Management Hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { getCurrentUserWorkspace } from '@/utils/auth';
import { entitlementService } from '@/services/entitlementService';
import { logService } from '@/services/logging';

export interface WorkspaceInfo {
  id: string;
  name: string;
  owner_id: string | null;
  wtype: string;
  created_at: string;
  updated_at: string;
}

export interface UseWorkspaceResult {
  workspace: WorkspaceInfo | null;
  workspaceId: string | null;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const isOwner = workspace?.owner_id === user?.id;

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentWorkspaceId = await getCurrentUserWorkspace();
      if (!currentWorkspaceId) {
        setError('No workspace assigned');
        return;
      }

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', currentWorkspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData);
      setWorkspaceId(currentWorkspaceId);

      // Initialize entitlements if needed
      if (workspaceData) {
        try {
          await entitlementService.initializeDefaultEntitlements(currentWorkspaceId);
          await entitlementService.syncWithSubscription(currentWorkspaceId);
        } catch (entitlementError) {
          // Log but don't fail the workspace load
          logService.log('warn', 'Failed to sync entitlements', { 
            error: entitlementError, 
            workspaceId: currentWorkspaceId 
          });
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(errorMessage);
      logService.log('error', 'Workspace load failed', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (newWorkspaceId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is member of the new workspace
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', newWorkspaceId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        throw new Error('Not a member of this workspace');
      }

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', newWorkspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData);
      setWorkspaceId(newWorkspaceId);

      // Update user settings to remember this workspace
      if (user?.id) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            workspace_default: newWorkspaceId
          }, {
            onConflict: 'user_id'
          });
      }

      logService.log('info', 'Workspace switched', { 
        userId: user?.id, 
        workspaceId: newWorkspaceId 
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch workspace';
      setError(errorMessage);
      logService.log('error', 'Workspace switch failed', { error: err, workspaceId: newWorkspaceId });
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    await loadWorkspace();
  };

  useEffect(() => {
    if (user?.id) {
      loadWorkspace();
    } else {
      setLoading(false);
      setWorkspace(null);
      setWorkspaceId(null);
      setError(null);
    }
  }, [user?.id]);

  return {
    workspace,
    workspaceId,
    isOwner,
    loading,
    error,
    refreshWorkspace,
    switchWorkspace
  };
}