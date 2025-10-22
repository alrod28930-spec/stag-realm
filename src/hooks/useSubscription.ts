/**
 * Subscription hook stub - always returns full access
 * Subscriptions have been replaced with roles + feature flags
 */
export function useSubscription() {
  return { 
    tier: 'elite' as const, 
    status: 'inactive' as const, 
    enforced: false, 
    entitlements: [] as string[] 
  };
}

export function getUserTier() {
  return 'elite' as const;
}

export function hasFeatureAccess(_featureCode: string) {
  return true;
}
