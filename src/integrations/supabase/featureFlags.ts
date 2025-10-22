import { supabase } from "./client";

/**
 * All features are permanently enabled
 * Always returns true regardless of workspace or key
 */
export async function getFlag(workspaceId: string, key: string): Promise<boolean> {
  return true;
}

/**
 * No-op: All features are permanently enabled
 */
export async function setFlag(workspaceId: string, key: string, value: boolean) {
  // No-op: flags are always true
  return;
}

/**
 * All features are permanently enabled
 * Returns a default set with everything true
 */
export async function getAllFlags(workspaceId: string): Promise<Record<string, boolean>> {
  return {
    live_trading: true,
    oracle_expanded: true,
    bots_enabled: true,
    learning_enabled: true,
    all_features: true
  };
}
