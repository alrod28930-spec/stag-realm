/**
 * Subscription Gate - Central point for all subscription/tier checks
 * When VITE_SUBSCRIPTION_ENFORCEMENT=false, all users are treated as Elite tier
 */

import { featureFlags } from './featureFlags';

export type UserTier = 'lite' | 'standard' | 'pro' | 'elite';

export interface SubscriptionStatus {
  tier: UserTier;
  unlocked: boolean;
  features: string[];
}

/**
 * Check if subscription enforcement is enabled
 */
export function isSubscriptionEnforcementEnabled(): boolean {
  // Check environment variable first
  const envFlag = import.meta.env.VITE_SUBSCRIPTION_ENFORCEMENT;
  if (envFlag === 'false' || envFlag === false) {
    return false;
  }
  
  // Then check feature flags
  return featureFlags.isEnabled('subscription_enforcement');
}

/**
 * Get the current user's subscription status
 * When enforcement is disabled, always returns Elite tier with full access
 */
export function getSubscriptionStatus(): SubscriptionStatus {
  const enforcementEnabled = isSubscriptionEnforcementEnabled();
  
  if (!enforcementEnabled) {
    // Subscription enforcement disabled - treat everyone as Elite
    return {
      tier: 'elite',
      unlocked: true,
      features: ['*'] // All features unlocked
    };
  }
  
  // TODO: When re-enabling subscriptions, implement actual tier checking here
  // For now, still default to elite since we removed the subscription system
  return {
    tier: 'elite',
    unlocked: true,
    features: ['*']
  };
}

/**
 * Check if a specific feature is available to the user
 */
export function hasFeatureAccess(featureCode: string): boolean {
  const status = getSubscriptionStatus();
  
  // If unlocked or features include '*', allow everything
  if (status.unlocked || status.features.includes('*')) {
    return true;
  }
  
  // Check if specific feature is in the list
  return status.features.includes(featureCode);
}

/**
 * Get the user's tier
 */
export function getUserTier(): UserTier {
  return getSubscriptionStatus().tier;
}

/**
 * Check if user has a specific tier or higher
 */
export function hasTierAccess(requiredTier: UserTier): boolean {
  const status = getSubscriptionStatus();
  
  // If enforcement disabled, always allow
  if (!isSubscriptionEnforcementEnabled()) {
    return true;
  }
  
  const tierHierarchy: UserTier[] = ['lite', 'standard', 'pro', 'elite'];
  const userTierIndex = tierHierarchy.indexOf(status.tier);
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
  
  return userTierIndex >= requiredTierIndex;
}
