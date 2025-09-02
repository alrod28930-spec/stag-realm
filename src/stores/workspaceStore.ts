import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface Workspace {
  id: string;
  name: string;
  safe_name?: string;
  wtype?: 'personal' | 'business' | 'team';
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string, wtype?: 'personal' | 'business' | 'team') => Promise<Workspace | null>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  inviteMember: (email: string, role: WorkspaceMember['role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  members: [],
  isLoading: false,
  error: null,

  loadWorkspaces: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ workspaces: workspaces || [], isLoading: false });

      // Set first workspace as current if none selected
      const { currentWorkspace } = get();
      if (!currentWorkspace && workspaces && workspaces.length > 0) {
        set({ currentWorkspace: workspaces[0] });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load workspaces',
        isLoading: false 
      });
    }
  },

  setCurrentWorkspace: (workspace: Workspace) => {
    set({ currentWorkspace: workspace });
  },

  createWorkspace: async (name: string, wtype: 'personal' | 'business' | 'team' = 'personal') => {
    set({ isLoading: true, error: null });
    
    try {
      // Use the RPC function for safe workspace creation
      const { data: workspaceId, error } = await supabase.rpc(
        'create_workspace_safely',
        {
          p_name: name,
          p_wtype: wtype
        }
      );

      if (error) throw error;

      if (!workspaceId) {
        throw new Error('Failed to create workspace - no ID returned');
      }

      // Reload workspaces to get the updated list
      await get().loadWorkspaces();
      
      // Find and return the newly created workspace
      const { workspaces } = get();
      const newWorkspace = workspaces.find(w => w.id === workspaceId);
      
      if (newWorkspace) {
        set({ currentWorkspace: newWorkspace, isLoading: false });
        return newWorkspace;
      }
      
      throw new Error('Created workspace not found in list');
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create workspace',
        isLoading: false 
      });
      return null;
    }
  },

  updateWorkspace: async (id: string, updates: Partial<Workspace>) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      const { workspaces, currentWorkspace } = get();
      const updatedWorkspaces = workspaces.map(w => 
        w.id === id ? { ...w, ...updates } : w
      );
      
      set({ 
        workspaces: updatedWorkspaces,
        currentWorkspace: currentWorkspace?.id === id 
          ? { ...currentWorkspace, ...updates } 
          : currentWorkspace
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update workspace' });
    }
  },

  inviteMember: async (email: string, role: WorkspaceMember['role']) => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    try {
      // In a real app, you'd send an invitation email
      // For now, we'll assume the user exists and add them directly
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: email, // This would be a real user ID
          role
        });

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to invite member' });
    }
  },

  removeMember: async (userId: string) => {
    const { currentWorkspace } = get();
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove member' });
    }
  }
}));