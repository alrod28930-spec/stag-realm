/**
 * Workspace ID resolver
 * Ensures a valid workspace ID is always used
 */
export function resolveWorkspaceId(
  uiWsId?: string,
  userDefaultWsId?: string,
  fallback?: string
): string {
  return uiWsId || userDefaultWsId || fallback || '';
}

/**
 * Get the elite test workspace ID
 */
export const ELITE_TEST_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

/**
 * Get the demo workspace ID
 */
export const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
