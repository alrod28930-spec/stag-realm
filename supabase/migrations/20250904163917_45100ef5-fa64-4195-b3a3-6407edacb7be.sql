-- Create table for user's docked brokerage sites
CREATE TABLE IF NOT EXISTS public.brokerage_dock_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brokerage_dock_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user access
CREATE POLICY "Users can manage their own docked sites" 
ON public.brokerage_dock_sites 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_brokerage_dock_sites_updated_at
BEFORE UPDATE ON public.brokerage_dock_sites
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();