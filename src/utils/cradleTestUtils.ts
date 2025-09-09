// Test utilities for Cradle spreadsheet functionality
import { useAuthStore } from '@/stores/authStore';

/**
 * Check if user is a test account (demo or owner)
 */
export function isTestAccount(): boolean {
  const user = useAuthStore.getState().user;
  return (
    user?.email === 'demo@example.com' ||
    user?.email === 'john.trader@stagalgo.com' ||
    user?.id === '00000000-0000-0000-0000-000000000000' ||
    user?.id === '00000000-0000-0000-0000-000000000002'
  );
}

/**
 * Get test-safe storage key for Cradle sheets
 */
export function getCradleStorageKey(): string {
  const user = useAuthStore.getState().user;
  if (user?.email === 'john.trader@stagalgo.com') {
    return 'owner-cradle-sheets';
  }
  return 'demo-cradle-sheets';
}

/**
 * Clear test data from localStorage
 */
export function clearTestData(): void {
  localStorage.removeItem('demo-cradle-sheets');
  localStorage.removeItem('owner-cradle-sheets');
}

/**
 * Log debug information about current auth state
 */
export function debugAuthState(): void {
  const authState = useAuthStore.getState();
  console.log('=== CRADLE DEBUG ===');
  console.log('User:', authState.user);
  console.log('Is Test Account:', isTestAccount());
  console.log('Is Authenticated:', authState.isAuthenticated);
  console.log('Storage Key:', getCradleStorageKey());
  console.log('===================');
}

/**
 * Validate that no database operations will be attempted for test accounts
 */
export function validateTestAccountSafety(): {
  isTestAccount: boolean;
  shouldUseDatabaseOps: boolean;
  errors: string[];
} {
  const user = useAuthStore.getState().user;
  const isTest = isTestAccount();
  const errors: string[] = [];
  
  if (isTest) {
    // Test accounts should never use database operations
    if (user && (
      user.id !== '00000000-0000-0000-0000-000000000000' &&
      user.id !== '00000000-0000-0000-0000-000000000002'
    )) {
      errors.push(`Test account has unexpected ID: ${user.id}`);
    }
  }
  
  return {
    isTestAccount: isTest,
    shouldUseDatabaseOps: !isTest,
    errors
  };
}