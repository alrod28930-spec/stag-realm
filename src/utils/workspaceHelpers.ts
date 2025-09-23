// Workspace Helper Utilities
import { supabase } from '@/integrations/supabase/client';
import { logService } from '@/services/logging';

export interface CreateWorkspaceOptions {
  name: string;
  owner_id: string;
  wtype?: 'personal' | 'business' | 'team';
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

/**
 * Create a new workspace with proper setup
 */
export async function createWorkspace(options: CreateWorkspaceOptions): Promise<string> {
  try {
    const { name, owner_id, wtype = 'personal' } = options;

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_id,
        wtype
      })
      .select('id')
      .single();

    if (workspaceError) throw workspaceError;

    // Add owner as member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: owner_id,
        role: 'owner'
      });

    if (memberError) throw memberError;

    logService.log('info', 'Workspace created', {
      workspaceId: workspace.id,
      name,
      owner_id,
      wtype
    });

    return workspace.id;
  } catch (error) {
    logService.log('error', 'Failed to create workspace', { error, options });
    throw error;
  }
}

/**
 * Add member to workspace
 */
export async function addWorkspaceMember(
  workspaceId: string, 
  userId: string, 
  role: 'admin' | 'member' | 'viewer' = 'member'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role
      });

    if (error) throw error;

    logService.log('info', 'Member added to workspace', {
      workspaceId,
      userId,
      role
    });
  } catch (error) {
    logService.log('error', 'Failed to add workspace member', { error, workspaceId, userId });
    throw error;
  }
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw error;

    logService.log('info', 'Member removed from workspace', {
      workspaceId,
      userId
    });
  } catch (error) {
    logService.log('error', 'Failed to remove workspace member', { error, workspaceId, userId });
    throw error;
  }
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logService.log('error', 'Failed to get workspace members', { error, workspaceId });
    return [];
  }
}

/**
 * Check if user is workspace member
 */
export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    logService.log('error', 'Failed to check workspace membership', { error, workspaceId, userId });
    return false;
  }
}

/**
 * Get workspaces for user
 */
export async function getUserWorkspaces(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        created_at,
        workspaces:workspace_id (
          id,
          name,
          owner_id,
          wtype,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(item => ({
      ...item.workspaces,
      membership_role: item.role,
      joined_at: item.created_at
    })) || [];
  } catch (error) {
    logService.log('error', 'Failed to get user workspaces', { error, userId });
    return [];
  }
}

/**
 * Update workspace details
 */
export async function updateWorkspace(
  workspaceId: string, 
  updates: { name?: string; wtype?: 'personal' | 'business' | 'team' }
): Promise<void> {
  try {
    // Ensure wtype is properly typed for database
    const validatedUpdates: { name?: string; wtype?: 'personal' | 'business' | 'team' } = {
      ...updates
    };
    
    const { error } = await supabase
      .from('workspaces')
      .update(validatedUpdates)
      .eq('id', workspaceId);

    if (error) throw error;

    logService.log('info', 'Workspace updated', { workspaceId, updates });
  } catch (error) {
    logService.log('error', 'Failed to update workspace', { error, workspaceId, updates });
    throw error;
  }
}

/**
 * Delete workspace (owner only)
 */
export async function deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  try {
    // Check if user is owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) throw workspaceError;
    if (workspace.owner_id !== userId) {
      throw new Error('Only workspace owner can delete workspace');
    }

    // Delete workspace (cascade will handle members)
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) throw error;

    logService.log('info', 'Workspace deleted', { workspaceId, userId });
  } catch (error) {
    logService.log('error', 'Failed to delete workspace', { error, workspaceId, userId });
    throw error;
  }
}