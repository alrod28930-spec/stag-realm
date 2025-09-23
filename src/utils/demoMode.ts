import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

/**
 * Check if the current user is using the SINGLE demo account for landing page display
 * ALL other accounts should show NO mock data
 */
export function isDemoMode(): boolean {
  const authState = useAuthStore.getState();
  // ONLY the single demo account gets demo data - ALL other accounts are empty until API keys connected
  return authState.user?.email === 'demo@example.com' && 
         authState.user?.id === '00000000-0000-0000-0000-000000000000';
}

/**
 * Check if user should have demo-level access to all tabs for viewing
 */
export function isDemoAccess(): boolean {
  return isDemoMode();
}

/**
 * Initialize demo mode when demo user logs in
 */
export function initializeDemoMode(): void {
  if (isDemoMode()) {
    demoDataService.activate();
  } else {
    demoDataService.deactivate();
  }
}

/**
 * Get demo-safe user data
 */
export function getDemoSafeUser() {
  const authState = useAuthStore.getState();
  if (isDemoMode()) {
    return {
      ...authState.user,
      name: 'Demo User',
      email: authState.user?.email || 'demo@example.com'
    };
  }
  return authState.user;
}

/**
 * Demo mode hook for React components
 */
export function useDemoMode() {
  const user = useAuthStore(state => state.user);
  // ONLY the single demo account gets demo data - ALL other accounts are empty
  const isDemo = user?.email === 'demo@example.com' && 
                 user?.id === '00000000-0000-0000-0000-000000000000';
  return {
    isDemoMode: isDemo,
    demoUser: isDemo ? user : null
  };
}