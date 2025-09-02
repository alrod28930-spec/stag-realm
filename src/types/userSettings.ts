export interface UserSettings {
  user_id: string;
  workspace_default?: string;
  theme: string;
  analyst_persona: string;
  voice_profile: string;
  notifications_email: boolean;
  notifications_push: boolean;
  data_sharing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserOverride {
  workspace_id: string;
  user_id: string;
  key: string;
  value: any;
}

export interface BrokerageConnection {
  id: string;
  workspace_id: string;
  provider: string;
  account_label?: string;
  scope?: any;
  status: 'active' | 'revoked' | 'error';
  last_sync?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  push_token?: string;
  platform?: 'web' | 'ios' | 'android';
  last_seen: string;
}

export interface ComplianceAcknowledgment {
  id: string;
  user_id: string;
  workspace_id?: string;
  document_type: string;
  version: string;
  acknowledged_at: string;
  ip_address?: string;
  user_agent?: string;
}