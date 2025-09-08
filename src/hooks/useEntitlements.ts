import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface Entitlement {
  feature_code: string;
  enabled: boolean;
  source: string;
}

export function useEntitlements(workspaceId: string | undefined) {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!workspaceId || !user) {
      setLoading(false);
      return;
    }

    const fetchEntitlements = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('workspace_entitlements')
          .select('feature_code, enabled, source')
          .eq('workspace_id', workspaceId)
          .eq('enabled', true);

        if (fetchError) throw fetchError;
        setEntitlements(data || []);
      } catch (err) {
        console.error('Error fetching entitlements:', err);
        setError(err instanceof Error ? err.message : 'Failed to load entitlements');
      } finally {
        setLoading(false);
      }
    };

    fetchEntitlements();
  }, [workspaceId, user]);

  const hasFeature = (featureCode: string): boolean => {
    return entitlements.some(e => e.feature_code === featureCode && e.enabled);
  };

  const checkFeature = async (featureCode: string): Promise<boolean> => {
    if (!workspaceId) return false;

    try {
      const { data, error } = await supabase.rpc('has_entitlement', {
        p_workspace: workspaceId,
        p_feature: featureCode
      });

      if (error) throw error;
      return data || false;
    } catch (err) {
      console.error('Error checking entitlement:', err);
      return false;
    }
  };

  return {
    entitlements,
    loading,
    error,
    hasFeature,
    checkFeature
  };
}