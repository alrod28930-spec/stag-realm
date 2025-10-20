/**
 * Shared subscription enforcement flag
 * When false (default), all subscription checks are bypassed - everyone is treated as Elite tier
 * Set SUBSCRIPTION_ENFORCEMENT=true to re-enable tier restrictions
 */
export const ENFORCE_SUBS = 
  (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") ?? "false").toLowerCase() === "true";

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
