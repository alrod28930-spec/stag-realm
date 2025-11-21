/**
 * Hook to check if the current user is a demo account
 * and provide demo-aware data fetching utilities
 */
import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export function useDemoAware() {
  const user = useAuthStore(state => state.user);
  
  const isDemoUser = 
    user?.id === DEMO_USER_ID || 
    user?.email === 'demo@example.com';

  return {
    isDemoUser,
    demoWorkspaceId: DEMO_WORKSPACE_ID,
    demoDataService: isDemoUser ? demoDataService : null
  };
}

/**
 * Check if a workspace ID is the demo workspace
 */
export function isDemoWorkspace(workspaceId?: string | null): boolean {
  return workspaceId === DEMO_WORKSPACE_ID;
}

/**
 * Check if a user ID is the demo user
 */
export function isDemoUserId(userId?: string | null): boolean {
  return userId === DEMO_USER_ID;
}
