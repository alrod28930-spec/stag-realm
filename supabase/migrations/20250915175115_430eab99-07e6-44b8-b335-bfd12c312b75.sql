-- Create user-specific BID profile table
CREATE TABLE IF NOT EXISTS public.user_bid_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  profile_data JSONB NOT NULL DEFAULT '{}',
  demo_mode BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_workspace_bid UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE public.user_bid_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can access their own BID profiles" 
ON public.user_bid_profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_bid_profiles_user_id ON public.user_bid_profiles(user_id);
CREATE INDEX idx_user_bid_profiles_workspace_id ON public.user_bid_profiles(workspace_id);
CREATE INDEX idx_user_bid_profiles_demo_mode ON public.user_bid_profiles(demo_mode);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_user_bid_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_bid_profiles_timestamp
  BEFORE UPDATE ON public.user_bid_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_bid_profile_timestamp();

-- Create analyst context table for storing session data
CREATE TABLE IF NOT EXISTS public.analyst_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  session_id TEXT NOT NULL,
  context_data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_session_context UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.analyst_context ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can access their own analyst context" 
ON public.analyst_context 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_analyst_context_user_id ON public.analyst_context(user_id);
CREATE INDEX idx_analyst_context_session_id ON public.analyst_context(session_id);
CREATE INDEX idx_analyst_context_expires_at ON public.analyst_context(expires_at);