// Authentication and Workspace Helper Functions
import { supabase } from '@/integrations/supabase/client';

export async function getCurrentUserWorkspace(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!workspace) {
      // Create default workspace for user if none exists
      const { data: newWorkspace } = await supabase
        .from('workspaces')
        .insert({
          name: `${user.email}'s Workspace`,
          owner_id: user.id,
          wtype: 'personal'
        })
        .select()
        .single();
        
      if (newWorkspace) {
        await supabase.from('workspace_members').insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner'
        });
        return newWorkspace.id;
      }
      return null;
    }
    
    return workspace.workspace_id;
  } catch (error) {
    console.warn('Failed to get user workspace:', error);
    return null;
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}