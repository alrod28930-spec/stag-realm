import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { isDemoMode } from '@/utils/demoMode';

export type SubscriptionTier = 'lite' | 'standard' | 'pro' | 'elite';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
}

export interface TabAccess {
  hasAccess: boolean;
  requiresTier: SubscriptionTier;
  isLocked: boolean;
}

// Tab feature mapping to subscription tiers
const TAB_FEATURES = {
  '/': { code: 'TAB_DASHBOARD', tier: 'standard' as SubscriptionTier },
  '/intelligence': { code: 'TAB_INTELLIGENCE', tier: 'standard' as SubscriptionTier },
  '/market': { code: 'TAB_MARKET', tier: 'standard' as SubscriptionTier },
  '/portfolio': { code: 'TAB_PORTFOLIO', tier: 'pro' as SubscriptionTier },
  '/trading-desk': { code: 'TAB_TRADING_DESK', tier: 'pro' as SubscriptionTier },
  '/charts': { code: 'TAB_CHARTS', tier: 'standard' as SubscriptionTier },
  '/workspace': { code: 'TAB_WORKSPACE', tier: 'elite' as SubscriptionTier },
  '/brokerage-dock': { code: 'TAB_BROKERAGE_DOCK', tier: 'elite' as SubscriptionTier },
  '/cradle': { code: 'TAB_CRADLE', tier: 'elite' as SubscriptionTier },
} as const;

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  lite: 0,
  standard: 1,
  pro: 2,
  elite: 3,
};

export function useSubscriptionAccess() {
  
  const { user } = useAuthStore();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    tier: 'lite',
    isActive: false,
    isDemo: false,
    loading: true,
    error: null,
  });
  

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) {
        setSubscriptionStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));

        // Check if user is in demo mode or is the demo owner
        const isDemo = isDemoMode();
        
        // Also check if this is the demo owner account for development
        const isDemoOwner = user?.email === 'alrod28930@gmail.com';
        
        if (isDemo || isDemoOwner) {
          setSubscriptionStatus({
            tier: 'elite',  // Demo users and owner can see all tabs with full access
            isActive: true,
            isDemo: isDemo && !isDemoOwner, // Only mark as demo if it's demo mode, not the owner
            loading: false,
            error: null,
          });
          return;
        }

        // Get user's subscription from database
        const { data, error } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('workspace_id', user.organizationId)
          .eq('status', 'active')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        const tier = (data?.plan as SubscriptionTier) || 'lite';
        const isActive = data?.status === 'active';

        setSubscriptionStatus({
          tier,
          isActive,
          isDemo: false,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load subscription',
        }));
      }
    };

    fetchSubscriptionStatus();
  }, [user]);

  const checkTabAccess = (path: string): TabAccess => {
    const tabFeature = TAB_FEATURES[path as keyof typeof TAB_FEATURES];
    if (!tabFeature) {
      return { hasAccess: true, requiresTier: 'lite', isLocked: false };
    }

    const { tier: currentTier, isDemo } = subscriptionStatus;
    const requiredTier = tabFeature.tier;

    // Demo users and elite tier users have access to all tabs
    if (isDemo || currentTier === 'elite') {
      return { hasAccess: true, requiresTier: requiredTier, isLocked: false };
    }

    // Check if current tier meets the requirement
    const hasAccess = TIER_HIERARCHY[currentTier] >= TIER_HIERARCHY[requiredTier];
    
    return {
      hasAccess,
      requiresTier: requiredTier,
      isLocked: !hasAccess,
    };
  };

  const getUpgradeMessage = (requiredTier: SubscriptionTier): string => {
    switch (requiredTier) {
      case 'standard':
        return 'Upgrade to Standard to unlock this feature';
      case 'pro':
        return 'Upgrade to Pro to unlock this feature';
      case 'elite':
        return 'Upgrade to Elite to unlock this feature';
      default:
        return 'Upgrade your plan to unlock this feature';
    }
  };

  const getTierDisplayName = (tier: SubscriptionTier): string => {
    switch (tier) {
      case 'lite':
        return 'Free Demo';
      case 'standard':
        return 'Standard';
      case 'pro':
        return 'Pro';
      case 'elite':
        return 'Elite';
      default:
        return 'Unknown';
    }
  };

  return {
    subscriptionStatus,
    checkTabAccess,
    getUpgradeMessage,
    getTierDisplayName,
    tabFeatures: TAB_FEATURES,
  };
}