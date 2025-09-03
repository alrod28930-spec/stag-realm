import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

/**
 * Check if the current user is using the demo account
 */
export function isDemoMode(): boolean {
  const authState = useAuthStore.getState();
  return authState.user?.email === 'demo@example.com';
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
      email: 'demo@example.com'
    };
  }
  return authState.user;
}

/**
 * Demo mode hook for React components
 */
export function useDemoMode() {
  const user = useAuthStore(state => state.user);
  return {
    isDemoMode: user?.email === 'demo@example.com',
    demoUser: user?.email === 'demo@example.com' ? user : null
  };
}