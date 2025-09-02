import { supabase } from "@/integrations/supabase/client";
import { BotProfile, BotProfileUpdate, ComplianceAcknowledgment } from "@/types/botProfile";

// Calculate risk indicator based on capital risk and daily target
export const calculateRiskIndicator = (capitalRisk: number, dailyTarget: number): 'low' | 'medium' | 'high' => {
  // Low = (5% risk & ≤1% target)
  if (capitalRisk <= 0.05 && dailyTarget <= 0.01) {
    return 'low';
  }
  
  // High = (20% risk or 5% target)
  if (capitalRisk >= 0.20 || dailyTarget >= 0.05) {
    return 'high';
  }
  
  // Medium = everything else (combos around 10% / 2%)
  return 'medium';
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