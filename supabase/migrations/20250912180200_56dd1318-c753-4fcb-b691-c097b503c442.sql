-- Create dividend reference data table
CREATE TABLE public.div_ref (
  symbol text NOT NULL PRIMARY KEY,
  adps numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'Q' CHECK (frequency IN ('M', 'Q', 'S', 'A')),
  ex_date date,
  pay_date date,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create workspace-specific dividend overrides table
CREATE TABLE public.div_overrides (
  workspace_id uuid NOT NULL,
  symbol text NOT NULL,
  adps numeric,
  frequency text CHECK (frequency IN ('M', 'Q', 'S', 'A')),
  growth_rate numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol)
);

-- Create user dividend calculations table for persistence
CREATE TABLE public.div_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  shares numeric NOT NULL,
  current_price numeric NOT NULL,
  adps numeric NOT NULL,
  frequency text NOT NULL,
  months_horizon integer NOT NULL DEFAULT 12,
  drip_enabled boolean NOT NULL DEFAULT false,
  withholding_pct numeric NOT NULL DEFAULT 0,
  growth_rate numeric NOT NULL DEFAULT 0,
  price_assumption numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.div_ref ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.div_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.div_calculations ENABLE ROW LEVEL SECURITY;

-- Create policies for div_ref (global read)
CREATE POLICY "div_ref_global_read" 
ON public.div_ref 
FOR SELECT 
USING (true);

-- Create policies for div_overrides
CREATE POLICY "Members can access div overrides" 
ON public.div_overrides 
FOR ALL 
USING (is_member_of_workspace(workspace_id))
WITH CHECK (is_member_of_workspace(workspace_id));

-- Create policies for div_calculations
CREATE POLICY "Users can manage own calculations" 
ON public.div_calculations 
FOR ALL 
USING (auth.uid() = user_id AND is_member_of_workspace(workspace_id))
WITH CHECK (auth.uid() = user_id AND is_member_of_workspace(workspace_id));

-- Create triggers for updated_at
CREATE TRIGGER update_div_overrides_updated_at
BEFORE UPDATE ON public.div_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_div_calculations_updated_at
BEFORE UPDATE ON public.div_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample dividend reference data
INSERT INTO public.div_ref (symbol, adps, frequency) VALUES
('AAPL', 0.94, 'Q'),
('MSFT', 2.72, 'Q'),
('KO', 1.76, 'Q'),
('JNJ', 4.40, 'Q'),
('PG', 3.65, 'Q'),
('VZ', 2.51, 'Q'),
('T', 1.11, 'Q'),
('XOM', 3.64, 'Q'),
('CVX', 6.04, 'Q'),
('IBM', 6.63, 'Q');