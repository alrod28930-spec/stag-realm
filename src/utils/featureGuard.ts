import { supabase } from '@/integrations/supabase/client';
import { isDemoMode } from './demoMode';

/**
 * Check if a feature is available for a workspace
 */
export async function checkFeatureAccess(workspaceId: string, feature: string): Promise<boolean> {
  try {
    // Demo users have access to all features only if they are the SINGLE demo account
    if (isDemoMode()) {
      return true;
    }


    const { data, error } = await supabase.rpc('has_entitlement', {
      p_workspace: workspaceId,
      p_feature: feature
    });

    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }

    return data || false;
  } catch (err) {
    console.error('Failed to check feature access:', err);
    return false;
  }
}

/**
 * Server-side feature guard - call this from edge functions
 */
export async function requireFeatureAccess(workspaceId: string, feature: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('feature-guard', {
      body: { workspaceId, feature }
    });

    if (error) {
      if (error.message?.includes('FEATURE_LOCKED')) {
        throw new Error(`LOCKED_FEATURE:${feature}`);
      }
      throw error;
    }

    return data;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('LOCKED_FEATURE:')) {
      throw err;
    }
    console.error('Feature guard check failed:', err);
    throw new Error(`Feature access verification failed: ${feature}`);
  }
}

/**
 * Log feature lock events
 */
export async function logFeatureLock(
  workspaceId: string | null, 
  feature: string, 
  event: 'viewed' | 'denied' | 'upgrade_clicked',
  metadata?: Record<string, any>
) {
  try {
    const eventTypes = {
      viewed: 'locks.viewed',
      denied: 'locks.denied', 
      upgrade_clicked: 'billing.checkout.start'
    };

    const summaries = {
      viewed: `User viewed locked feature: ${feature}`,
      denied: `Feature access denied: ${feature}`,
      upgrade_clicked: `User clicked upgrade CTA for ${feature}`
    };

    await supabase.rpc('recorder_log', {
      p_workspace: workspaceId,
      p_event_type: eventTypes[event],
      p_severity: event === 'denied' ? 2 : 1,
      p_entity_type: 'feature',
      p_entity_id: feature,
      p_summary: summaries[event],
      p_payload: { 
        feature_code: feature,
        ...metadata
      }
    });
  } catch (err) {
    console.error('Failed to log feature lock event:', err);
  }
}

/**
 * Get required tier for a feature
 */
export function getFeatureTier(feature: string): string {
  const tierMap: Record<string, string> = {
    // Standard tier - First 3 tabs
    'TAB_DASHBOARD': 'standard',
    'TAB_INTELLIGENCE': 'standard',
    'TAB_MARKET': 'standard',
    'PAPER_TRADING': 'standard',
    'LIVE_TRADING': 'standard',
    'CORE_BOTS': 'standard',
    'ORACLE_BASIC': 'standard',
    
    // Pro tier - Next 3 tabs  
    'TAB_PORTFOLIO': 'pro',
    'TAB_TRADING_DESK': 'pro',
    'TAB_CHARTS': 'pro',
    'ADV_BOTS': 'pro',
    'DAY_TRADE_MODE': 'pro',
    'ORACLE_EXPANDED': 'pro',
    
    // Elite tier - Remaining tabs
    'TAB_BROKERAGE_DOCK': 'elite',
    'TAB_CRADLE': 'elite',
    'WORKSPACE_MULTI_PANEL': 'elite',
    'VOICE_ANALYST': 'elite',
    'PRIORITY_SUPPORT': 'elite'
  };

  return tierMap[feature] || 'pro';
}

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: string): string {
  const displayNames: Record<string, string> = {
    standard: 'Standard', 
    pro: 'Pro',
    elite: 'Elite'
  };
  
  return displayNames[tier] || 'Pro';
}