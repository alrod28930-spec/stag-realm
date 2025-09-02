-- Create compliance acknowledgments table
CREATE TABLE IF NOT EXISTS compliance_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  version text NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE compliance_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their acknowledgments" ON compliance_acknowledgments 
FOR SELECT USING (user_id = auth.uid() OR is_member_of_workspace(workspace_id));

CREATE POLICY "Users can create acknowledgments" ON compliance_acknowledgments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  kyc_status text DEFAULT 'pending',
  aml_status text DEFAULT 'pending',
  accredited_investor boolean DEFAULT false,
  provider text,
  last_checked timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their verifications" ON user_verifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their verifications" ON user_verifications 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their verifications" ON user_verifications 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create regulatory reports table
CREATE TABLE IF NOT EXISTS regulatory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  period_start date,
  period_end date,
  generated_at timestamptz DEFAULT now(),
  file_path text,
  status text DEFAULT 'queued',
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE regulatory_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can access regulatory reports" ON regulatory_reports 
FOR SELECT USING (is_member_of_workspace(workspace_id));

CREATE POLICY "Members can create regulatory reports" ON regulatory_reports 
FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id) AND auth.uid() = created_by);

-- Create suspicious activity table
CREATE TABLE IF NOT EXISTS suspicious_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  ts timestamptz DEFAULT now(),
  activity_type text,
  severity smallint DEFAULT 1,
  description text,
  status text DEFAULT 'open',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can access suspicious activity" ON suspicious_activity 
FOR SELECT USING (is_member_of_workspace(workspace_id));

CREATE POLICY "Members can update suspicious activity" ON suspicious_activity 
FOR UPDATE USING (is_member_of_workspace(workspace_id));

-- Add retention metadata to existing tables
ALTER TABLE rec_events ADD COLUMN IF NOT EXISTS retention_until timestamptz DEFAULT (now() + interval '7 years');
ALTER TABLE analyst_outputs ADD COLUMN IF NOT EXISTS retention_until timestamptz DEFAULT (now() + interval '7 years');

-- Create trigger for updated_at on user_verifications
CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_user_workspace ON compliance_acknowledgments(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_document_type ON compliance_acknowledgments(document_type);
CREATE INDEX IF NOT EXISTS idx_user_verifications_workspace ON user_verifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_workspace_type ON regulatory_reports(workspace_id, report_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_workspace_status ON suspicious_activity(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_rec_events_retention ON rec_events(retention_until);
CREATE INDEX IF NOT EXISTS idx_analyst_outputs_retention ON analyst_outputs(retention_until);