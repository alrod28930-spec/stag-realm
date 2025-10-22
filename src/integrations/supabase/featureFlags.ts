import { supabase } from "./client";

/**
 * Get feature flag value from workspace's feature_flags table
 * Returns true by default if flag doesn't exist
 */
export async function getFlag(workspaceId: string, key: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('flags')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  
  if (!data?.flags) return true;
  
  // Feature flags are stored as JSONB, extract the specific key
  return (data.flags as Record<string, boolean>)[key] ?? true;
}

/**
 * Set feature flag value
 */
export async function setFlag(workspaceId: string, key: string, value: boolean) {
  const { data: existing } = await supabase
    .from('feature_flags')
    .select('flags')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  
  const flags = (existing?.flags as Record<string, boolean>) || {};
  flags[key] = value;
  
  await supabase
    .from('feature_flags')
    .upsert({
      workspace_id: workspaceId,
      flags,
      updated_at: new Date().toISOString()
    });
}

/**
 * Get all feature flags for workspace
 */
export async function getAllFlags(workspaceId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('feature_flags')
    .select('flags')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  
  return (data?.flags as Record<string, boolean>) || {};
}
