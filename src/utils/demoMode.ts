import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

/**
 * Check if the current user is using the demo account or should have demo access
 */
export function isDemoMode(): boolean {
  const authState = useAuthStore.getState();
  // Only the demo account gets demo data - real accounts should be empty until API keys are connected
  return authState.user?.email === 'demo@example.com' || 
         authState.user?.id === '00000000-0000-0000-0000-000000000000';
}

/**
 * Check if user should have demo-level access to all tabs for viewing
 */
export function isDemoAccess(): boolean {
  return isDemoMode();
}

/**
 * Initialize demo mode when demo user or owner test account logs in
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
  const isDemo = user?.email === 'demo@example.com' || 
                 user?.id === '00000000-0000-0000-0000-000000000000';
  return {
    isDemoMode: isDemo,
    demoUser: isDemo ? user : null
  };
}