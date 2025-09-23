// Workspace Initialization Utilities
import { supabase } from '@/integrations/supabase/client';
import { logService } from '@/services/logging';

export async function ensureUserHasWorkspace(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle demo account specially - check auth store first for demo users
    const authStore = (window as any).__authStore;
    if (authStore?.user?.email === 'demo@example.com' ||
        authStore?.user?.id === '00000000-0000-0000-0000-000000000000') {
      return '00000000-0000-0000-0000-000000000001';
    }
    
    // If no authenticated user, return null (not demo)
    if (!user) {
      logService.log('warn', 'No authenticated user found in ensureUserHasWorkspace');
      return null;
    }
    
    // Explicitly check for demo user ID to prevent confusion
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      return '00000000-0000-0000-0000-000000000001';
    }

    // First check user_settings for default workspace
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('workspace_default')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (userSettings?.workspace_default) {
      // Verify user is still a member of this workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('workspace_id', userSettings.workspace_default)
        .maybeSingle();
        
      if (membership) {
        return userSettings.workspace_default;
      }
    }

    // Check if user has any workspace membership
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingMembership) {
      // Update user settings to remember this workspace
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          workspace_default: existingMembership.workspace_id
        }, {
          onConflict: 'user_id'
        });
      return existingMembership.workspace_id;
    }

    // Check if there's an existing personal workspace for this user
    const { data: existingWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('wtype', 'personal')
      .maybeSingle();

    let workspaceId: string;

    if (existingWorkspace) {
      workspaceId = existingWorkspace.id;
    } else {
      // Create new personal workspace
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: `${user.email?.split('@')[0] || 'User'}'s Workspace`,
          owner_id: user.id,
          wtype: 'personal'
        })
        .select('id')
        .single();

      if (workspaceError || !newWorkspace) {
        logService.log('error', 'Failed to create workspace', { error: workspaceError });
        return null;
      }

      workspaceId = newWorkspace.id;
    }

    // Create workspace membership
    const { error: membershipError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner'
      });

    if (membershipError) {
      // If membership already exists, that's fine
      if (!membershipError.message.includes('duplicate key')) {
        logService.log('error', 'Failed to create workspace membership', { error: membershipError });
      }
    }

    // Update user settings
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        workspace_default: workspaceId
      }, {
        onConflict: 'user_id'
      });

    logService.log('info', 'User workspace ensured', { 
      userId: user.id, 
      workspaceId,
      email: user.email 
    });

    return workspaceId;
  } catch (error) {
    logService.log('error', 'Failed to ensure user workspace', { error });
    return null;
  }
}

async function ensureDemoWorkspaceMembership(): Promise<void> {
  try {
    // Check if demo workspace membership exists
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle();

    if (!existingMembership) {
      // Create demo workspace membership
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: '00000000-0000-0000-0000-000000000001',
          user_id: '00000000-0000-0000-0000-000000000000',
          role: 'owner'
        });

      if (error && !error.message.includes('duplicate key')) {
        console.warn('Failed to create demo workspace membership:', error);
      }
    }
  } catch (error) {
    console.warn('Demo workspace membership setup failed:', error);
  }
}

export async function initializeUserWorkspace(): Promise<void> {
  // This function is called during app initialization
  // to ensure proper workspace setup
  const workspaceId = await ensureUserHasWorkspace();
  
  if (workspaceId) {
    logService.log('info', 'User workspace initialized', { workspaceId });
  } else {
    logService.log('warn', 'Failed to initialize user workspace');
  }
}