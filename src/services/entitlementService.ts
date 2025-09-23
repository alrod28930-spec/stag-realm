// Entitlement Management Service
import { supabase } from '@/integrations/supabase/client';
import { logService } from './logging';

export interface EntitlementConfig {
  workspace_id: string;
  feature_code: string;
  enabled: boolean;
  source: 'subscription' | 'grant' | 'trial' | 'default';
}

class EntitlementService {
  /**
   * Provision entitlements based on subscription tier
   */
  async provisionTierEntitlements(workspaceId: string, tier: 'lite' | 'standard' | 'pro' | 'elite'): Promise<void> {
    try {
      // Get all features for this tier and below
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('code, tier_min');

      if (featuresError) throw featuresError;

      const tierHierarchy = ['lite', 'standard', 'pro', 'elite'];
      const userTierIndex = tierHierarchy.indexOf(tier);
      
      // Get features available for this tier level
      const availableFeatures = features?.filter(feature => 
        tierHierarchy.indexOf(feature.tier_min) <= userTierIndex
      ) || [];

      // Clear existing entitlements
      await supabase
        .from('workspace_entitlements')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('source', 'subscription');

      // Add new entitlements
      const entitlements = availableFeatures.map(feature => ({
        workspace_id: workspaceId,
        feature_code: feature.code,
        enabled: true,
        source: 'subscription' as const
      }));

      if (entitlements.length > 0) {
        const { error: insertError } = await supabase
          .from('workspace_entitlements')
          .insert(entitlements);

        if (insertError) throw insertError;
      }

      logService.log('info', 'Entitlements provisioned', {
        workspaceId,
        tier,
        featureCount: entitlements.length
      });

    } catch (error) {
      logService.log('error', 'Failed to provision entitlements', { error, workspaceId, tier });
      throw error;
    }
  }

  /**
   * Grant specific feature to workspace
   */
  async grantFeature(workspaceId: string, featureCode: string, source: 'grant' | 'trial' = 'grant'): Promise<void> {
    try {
      const { error } = await supabase
        .from('workspace_entitlements')
        .upsert({
          workspace_id: workspaceId,
          feature_code: featureCode,
          enabled: true,
          source
        }, {
          onConflict: 'workspace_id,feature_code'
        });

      if (error) throw error;

      logService.log('info', 'Feature granted', { workspaceId, featureCode, source });
    } catch (error) {
      logService.log('error', 'Failed to grant feature', { error, workspaceId, featureCode });
      throw error;
    }
  }

  /**
   * Revoke specific feature from workspace
   */
  async revokeFeature(workspaceId: string, featureCode: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workspace_entitlements')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('feature_code', featureCode);

      if (error) throw error;

      logService.log('info', 'Feature revoked', { workspaceId, featureCode });
    } catch (error) {
      logService.log('error', 'Failed to revoke feature', { error, workspaceId, featureCode });
      throw error;
    }
  }

  /**
   * Check if workspace has specific feature
   */
  async hasFeature(workspaceId: string, featureCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_entitlement', {
        p_workspace: workspaceId,
        p_feature: featureCode
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      logService.log('error', 'Failed to check feature', { error, workspaceId, featureCode });
      return false;
    }
  }

  /**
   * Get all entitlements for workspace
   */
  async getWorkspaceEntitlements(workspaceId: string): Promise<EntitlementConfig[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_entitlements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('enabled', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logService.log('error', 'Failed to get entitlements', { error, workspaceId });
      return [];
    }
  }

  /**
   * Initialize default entitlements for new workspace
   */
  async initializeDefaultEntitlements(workspaceId: string): Promise<void> {
    try {
      // Use the database function to ensure default entitlements
      const { error } = await supabase.rpc('ensure_default_entitlements', {
        p_workspace_id: workspaceId
      });

      if (error) throw error;

      logService.log('info', 'Default entitlements initialized', { workspaceId });
    } catch (error) {
      logService.log('error', 'Failed to initialize default entitlements', { error, workspaceId });
      throw error;
    }
  }

  /**
   * Sync entitlements with subscription status
   */
  async syncWithSubscription(workspaceId: string): Promise<void> {
    try {
      // Get current subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;

      if (subscription) {
        // Provision entitlements based on subscription tier
        await this.provisionTierEntitlements(workspaceId, subscription.plan);
      } else {
        // No active subscription, provision lite tier
        await this.provisionTierEntitlements(workspaceId, 'lite');
      }

      logService.log('info', 'Entitlements synced with subscription', { 
        workspaceId, 
        tier: subscription?.plan || 'lite' 
      });
    } catch (error) {
      logService.log('error', 'Failed to sync entitlements with subscription', { error, workspaceId });
      throw error;
    }
  }
}

export const entitlementService = new EntitlementService();