/**
 * Policy Override Utilities for Analyst-Core-V2
 * Loads and applies policy parameter overrides
 */

export async function loadPolicyOverride(
  supabase: any,
  workspace_id: string,
  policy_id: string
): Promise<any> {
  const { data, error } = await supabase
    .from('rl_policies')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('id', policy_id)
    .single();

  if (error) {
    console.error('[override] Failed to load policy:', error);
    return null;
  }

  return data;
}

export function applyPolicyParams(base: any, override: any): any {
  if (!override || !override.params) return base;

  return {
    ...base,
    // Merge risk parameters
    risk_base: override.params.risk_base ?? base.risk_base,
    risk_cap: override.params.risk_cap ?? base.risk_cap,
    w_win: override.params.w_win ?? base.w_win,
    w_oracle: override.params.w_oracle ?? base.w_oracle,
    
    // Merge stop/TP overrides
    stop_loss: override.params.stop_loss ?? base.stop_loss,
    take_profit: override.params.take_profit ?? base.take_profit,
    
    // Merge additional overrides
    max_position_risk_pct: override.params.max_position_risk_pct ?? base.max_position_risk_pct,
    
    // Track which policy was used
    _applied_policy_id: override.id,
    _applied_policy_name: override.name
  };
}

/**
 * Logs policy override usage to repository_events
 */
export async function logPolicyOverride(
  supabase: any,
  workspace_id: string,
  policy_id: string,
  params_hash: string
): Promise<void> {
  try {
    await supabase.from('repository_events').insert({
      workspace_id,
      user_id: null, // System event
      event_type: 'policy_override',
      entity_type: 'analyst',
      entity_id: policy_id,
      summary: `Policy override applied: ${policy_id}`,
      payload: {
        policy_id,
        params_hash,
        timestamp: new Date().toISOString()
      },
      severity: 1
    });
  } catch (err) {
    console.error('[override] Failed to log policy override:', err);
  }
}
