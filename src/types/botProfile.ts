export interface BotProfile {
  workspace_id: string;
  capital_risk_pct: number;
  daily_return_target_pct: number;
  execution_mode: 'manual' | 'automated';
  risk_indicator: 'low' | 'medium' | 'high';
  updated_at: string;
}

export interface BotProfileUpdate {
  capital_risk_pct?: number;
  daily_return_target_pct?: number;
  execution_mode?: 'manual' | 'automated';
  risk_indicator?: 'low' | 'medium' | 'high';
}

export interface RiskGoalsSettings {
  capitalRisk: number;
  dailyTarget: number;
  executionMode: 'manual' | 'automated';
}

export interface ComplianceAcknowledgment {
  id?: string;
  user_id: string;
  workspace_id: string;
  document_type: string;
  version: string;
  acknowledged_at?: string;
  ip_address?: string;
  user_agent?: string;
}