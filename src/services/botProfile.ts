import { supabase } from "@/integrations/supabase/client";
import { BotProfile, BotProfileUpdate, ComplianceAcknowledgment, DailyTargetMode } from "@/types/botProfile";

// Daily Target Mode presets with parameters
export const TARGET_MODE_PRESETS: Record<DailyTargetMode, {
  name: string;
  description: string;
  risk_per_trade_pct: number;
  max_trades_per_day: number;
  rr_min: number;
  stop_style: 'wide' | 'standard' | 'tight' | 'very_tight';
  signal_confidence_min: number;
  min_volume_usd: number;
  max_concurrent_positions: number;
  daily_loss_halt_pct: number;
}> = {
  '1p': {
    name: 'Conservative',
    description: 'Fewer, higher-quality trades',
    risk_per_trade_pct: 0.01,
    max_trades_per_day: 3,
    rr_min: 3.0,
    stop_style: 'wide',
    signal_confidence_min: 0.85,
    min_volume_usd: 2000000,
    max_concurrent_positions: 2,
    daily_loss_halt_pct: 0.5
  },
  '2p': {
    name: 'Moderate',
    description: 'Balanced opportunity',
    risk_per_trade_pct: 0.015,
    max_trades_per_day: 5,
    rr_min: 2.0,
    stop_style: 'standard',
    signal_confidence_min: 0.75,
    min_volume_usd: 1000000,
    max_concurrent_positions: 3,
    daily_loss_halt_pct: 0.75
  },
  '5p': {
    name: 'Aggressive',
    description: 'Higher frequency, tighter stops',
    risk_per_trade_pct: 0.03,
    max_trades_per_day: 8,
    rr_min: 1.5,
    stop_style: 'tight',
    signal_confidence_min: 0.65,
    min_volume_usd: 500000,
    max_concurrent_positions: 5,
    daily_loss_halt_pct: 1.0
  },
  '10p': {
    name: 'Very Aggressive',
    description: 'Opportunistic burst trading',
    risk_per_trade_pct: 0.04,
    max_trades_per_day: 12,
    rr_min: 1.2,
    stop_style: 'very_tight',
    signal_confidence_min: 0.55,
    min_volume_usd: 250000,
    max_concurrent_positions: 7,
    daily_loss_halt_pct: 1.0
  }
};

// Calculate risk indicator based on daily target mode and settings
export const calculateRiskIndicator = (
  dailyTargetMode: DailyTargetMode,
  capitalRisk: number,
  riskPerTrade?: number,
  maxTrades?: number,
  rrMin?: number
): 'low' | 'medium' | 'high' => {
  // Primary check: daily target mode
  if (dailyTargetMode === '1p') return 'low';
  if (dailyTargetMode === '2p') return 'medium';
  if (dailyTargetMode === '5p' || dailyTargetMode === '10p') return 'high';
  
  // Fallback to parameter-based calculation
  const effectiveRiskPerTrade = riskPerTrade || 0.01;
  const effectiveMaxTrades = maxTrades || 3;
  const effectiveRrMin = rrMin || 3.0;
  
  // Low = conservative parameters
  if (effectiveRiskPerTrade <= 0.01 && effectiveRrMin >= 3 && effectiveMaxTrades <= 3) {
    return 'low';
  }
  
  // High = aggressive parameters
  if (effectiveRiskPerTrade >= 0.03 || effectiveMaxTrades >= 8 || effectiveRrMin <= 1.5) {
    return 'high';
  }
  
  return 'medium';
};

// Apply daily target mode presets to profile update
export const applyTargetModePresets = (
  dailyTargetMode: DailyTargetMode,
  update: BotProfileUpdate
): BotProfileUpdate => {
  const presets = TARGET_MODE_PRESETS[dailyTargetMode];
  
  return {
    ...update,
    daily_target_mode: dailyTargetMode,
    risk_per_trade_pct: presets.risk_per_trade_pct,
    max_trades_per_day: presets.max_trades_per_day,
    rr_min: presets.rr_min,
    stop_style: presets.stop_style,
    signal_confidence_min: presets.signal_confidence_min,
    min_volume_usd: presets.min_volume_usd,
    max_concurrent_positions: presets.max_concurrent_positions,
    daily_loss_halt_pct: presets.daily_loss_halt_pct,
    // Update risk indicator based on new mode
    risk_indicator: calculateRiskIndicator(
      dailyTargetMode,
      update.capital_risk_pct || 0.05,
      presets.risk_per_trade_pct,
      presets.max_trades_per_day,
      presets.rr_min
    )
  };
};

// Load bot profile for workspace
export const getBotProfile = async (workspaceId: string): Promise<BotProfile | null> => {
  const { data, error } = await supabase
    .from('bot_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    console.error('Error loading bot profile:', error);
    return null;
  }

  return data as BotProfile;
};

// Save bot profile (after disclaimer accepted)
export const saveBotProfile = async (workspaceId: string, update: BotProfileUpdate): Promise<BotProfile | null> => {
  const { data, error } = await supabase
    .from('bot_profiles')
    .upsert({ 
      workspace_id: workspaceId, 
      ...update,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving bot profile:', error);
    return null;
  }

  return data as BotProfile;
};

// Log risk toggle acceptance
export const acknowledgeRiskToggle = async (
  workspaceId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('compliance_acknowledgments')
    .insert([{
      user_id: userId,
      workspace_id: workspaceId,
      document_type: 'risk_toggle_disclaimer',
      version: 'v1-2025-09-02',
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    }]);

  if (error) {
    console.error('Error logging risk toggle acknowledgment:', error);
    return false;
  }

  return true;
};

// Log settings change via recorder
export const logSettingsChange = async (
  workspaceId: string,
  eventType: string,
  payload: Record<string, any>,
  severity: number = 1
): Promise<boolean> => {
  const { error } = await supabase.rpc('recorder_log', {
    p_workspace: workspaceId,
    p_event_type: eventType,
    p_severity: severity,
    p_entity_type: 'settings',
    p_entity_id: 'bot_profile',
    p_summary: `Bot profile ${eventType}`,
    p_payload: payload
  });

  if (error) {
    console.error('Error logging settings change:', error);
    return false;
  }

  return true;
};