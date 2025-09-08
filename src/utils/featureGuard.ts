import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a feature is available for a workspace
 */
export async function checkFeatureAccess(workspaceId: string, feature: string): Promise<boolean> {
  try {
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
    // Lite tier
    'DEMO_TRADING': 'lite',
    'ANALYST_BASIC': 'lite', 
    'RECORDER_BASIC': 'lite',
    'CRADLE_SHEET': 'lite',
    
    // Standard tier  
    'TRADING_DESK': 'standard',
    'BROKERAGE_DOCK': 'standard',
    'PORTFOLIO_MIRROR': 'standard',
    'CORE_BOTS': 'standard',
    'ORACLE_BASIC': 'standard',
    
    // Pro tier
    'ADV_BOTS': 'pro',
    'DAY_TRADE_MODE': 'pro', 
    'ORACLE_EXPANDED': 'pro',
    'SEEKER': 'pro',
    'LEARNING_BOT': 'pro',
    'RECORDER_ADV': 'pro',
    'CRADLE_CODE': 'pro',
    
    // Elite tier
    'VOICE_ANALYST': 'elite',
    'WORLD_MARKETS': 'elite',
    'UNLIMITED_WORKSPACES': 'elite', 
    'PRIORITY_SUPPORT': 'elite'
  };

  return tierMap[feature] || 'pro';
}

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: string): string {
  const displayNames: Record<string, string> = {
    lite: 'Lite',
    standard: 'Standard', 
    pro: 'Pro',
    elite: 'Elite'
  };
  
  return displayNames[tier] || 'Pro';
}