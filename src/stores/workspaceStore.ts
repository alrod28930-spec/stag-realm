import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
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
  createWorkspace: (name: string) => Promise<Workspace | null>;
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

  createWorkspace: async (name: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Add user as owner to workspace_members
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner'
        });

      const { workspaces } = get();
      set({ 
        workspaces: [workspace, ...workspaces],
        currentWorkspace: workspace,
        isLoading: false 
      });

      return workspace;
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