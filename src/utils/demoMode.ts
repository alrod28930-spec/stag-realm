import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

/**
 * Check if the current user is the SINGLE demo account for landing page display ONLY
 * This should ONLY be used for the landing page demo portal
 */
export function isLandingPageDemo(): boolean {
  const authState = useAuthStore.getState();
  return authState.user?.email === 'demo@example.com' && 
         authState.user?.id === '00000000-0000-0000-0000-000000000000';
}

/**
 * Initialize landing page demo data when demo user logs in
 * This is ONLY for the landing page viewing portal
 */
export function initializeLandingPageDemo(): void {
  if (isLandingPageDemo()) {
    demoDataService.activate();
  } else {
    demoDataService.deactivate();
  }
}

/**
 * Landing page demo hook - ONLY for landing page components
 */
export function useLandingPageDemo() {
  const user = useAuthStore(state => state.user);
  const isDemo = user?.email === 'demo@example.com' && 
                 user?.id === '00000000-0000-0000-0000-000000000000';
  return {
    isLandingPageDemo: isDemo,
    demoUser: isDemo ? user : null
  };
}