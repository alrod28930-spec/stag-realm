-- Enable RLS on features table
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- Create policy for features table - make it readable by all authenticated users since it's reference data
CREATE POLICY "features_global_read" ON public.features
  FOR SELECT USING (true);