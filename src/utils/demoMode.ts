import { useAuthStore } from '@/stores/authStore';
import { demoDataService } from '@/services/demoDataService';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_USER_EMAIL = 'demo@example.com';

/**
 * Check if the current user is the demo account
 */
export function isLandingPageDemo(): boolean {
  const authState = useAuthStore.getState();
  return authState.user?.email === DEMO_USER_EMAIL && 
         authState.user?.id === DEMO_USER_ID;
}

/**
 * Initialize demo data when demo user logs in
 */
export function initializeLandingPageDemo(): void {
  if (isLandingPageDemo()) {
    demoDataService.activate();
    console.log('✅ Demo mode activated - all data is isolated from production');
  } else {
    demoDataService.deactivate();
  }
}

/**
 * Demo hook for components
 */
export function useLandingPageDemo() {
  const user = useAuthStore(state => state.user);
  const isDemo = user?.email === DEMO_USER_EMAIL && user?.id === DEMO_USER_ID;
  return {
    isLandingPageDemo: isDemo,
    demoUser: isDemo ? user : null
  };
}