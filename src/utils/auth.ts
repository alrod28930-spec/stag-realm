// Authentication and Workspace Helper Functions
import { supabase } from '@/integrations/supabase/client';

export async function getCurrentUserWorkspace(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle test accounts specially - never query database
    if (!user || 
        user.id === '00000000-0000-0000-0000-000000000000' || 
        user.id === '00000000-0000-0000-0000-000000000002') {
      // Check if we have a test user from the auth store
      const authStore = (window as any).__authStore;
      if (authStore?.user?.email === 'demo@example.com' || 
          authStore?.user?.email === 'john.trader@stagalgo.com' ||
          authStore?.user?.id === '00000000-0000-0000-0000-000000000000' ||
          authStore?.user?.id === '00000000-0000-0000-0000-000000000002') {
        return '00000000-0000-0000-0000-000000000001'; // Default workspace for test accounts
      }
      return null;
    }

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
  
  // Handle demo user specially
  if (!user) {
    const authStore = (window as any).__authStore;
    if (authStore?.user?.email === 'demo@example.com') {
      return {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'demo@example.com'
      };
    }
    if (authStore?.user?.email === 'john.trader@stagalgo.com') {
      return {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'john.trader@stagalgo.com'
      };
    }
  }
  
  return user;
}