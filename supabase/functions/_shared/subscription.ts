/**
 * Subscription enforcement is permanently disabled
 * All users have full Elite tier access to all features
 */
export const ENFORCE_SUBS = false;

/**
 * Check if subscription enforcement is active
 */
export function isSubscriptionEnforcementEnabled(): boolean {
  return ENFORCE_SUBS;
}

/**
 * Log subscription bypass for debugging
 */
export function logSubscriptionBypass(feature: string, userId: string) {
  if (!ENFORCE_SUBS) {
    console.log(`🔓 Subscription bypass: ${feature} accessed by ${userId} (enforcement disabled)`);
  }
}
