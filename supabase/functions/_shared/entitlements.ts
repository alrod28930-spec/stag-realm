/**
 * Entitlements bypass - all features permanently unlocked
 * No subscription or license enforcement
 */

export const SUBSCRIPTION_ENFORCEMENT = false;

/**
 * Always returns true - all features are accessible
 */
export function has_entitlement(workspace_id?: string, feature?: string): boolean {
  return true;
}

/**
 * Always returns Elite tier with full access
 */
export function checkUserTier(workspace_id?: string): { ok: boolean; tier: string } {
  return { ok: true, tier: 'Elite' };
}

/**
 * Always returns true - all features enabled
 */
export function checkFeatureFlag(workspace_id?: string, flag?: string): boolean {
  return true;
}

/**
 * Always returns active license status
 */
export function checkLicenseStatus(workspace_id?: string): { active: boolean; tier: string } {
  return { active: true, tier: 'Elite' };
}
