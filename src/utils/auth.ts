// Authentication and Workspace Helper Functions
import { supabase } from '@/integrations/supabase/client';
import { ensureUserHasWorkspace } from './workspaceInitializer';

export async function getCurrentUserWorkspace(): Promise<string | null> {
  return await ensureUserHasWorkspace();
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
  }
  
  return user;
}