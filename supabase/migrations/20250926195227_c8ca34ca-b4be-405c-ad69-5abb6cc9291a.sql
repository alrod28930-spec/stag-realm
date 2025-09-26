-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_price NUMERIC,
  time_in_force TEXT DEFAULT 'day',
  status TEXT NOT NULL DEFAULT 'pending',
  broker_order_id TEXT,
  filled_qty NUMERIC DEFAULT 0,
  filled_avg_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create market_data table for real-time quotes
CREATE TABLE public.market_data (
  workspace_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  price NUMERIC,
  change NUMERIC,
  change_percent NUMERIC,
  volume NUMERIC,
  high NUMERIC,
  low NUMERIC,
  open NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol)
);

-- Enable RLS on market_data
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Members can view workspace orders" 
ON public.orders 
FOR SELECT 
USING (is_member_of_workspace(workspace_id));

CREATE POLICY "Members can create workspace orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (is_member_of_workspace(workspace_id) AND user_id = auth.uid());

CREATE POLICY "Members can update workspace orders" 
ON public.orders 
FOR UPDATE 
USING (is_member_of_workspace(workspace_id));

-- Create RLS policies for market_data
CREATE POLICY "Members can access workspace market data" 
ON public.market_data 
FOR ALL 
USING (is_member_of_workspace(workspace_id))
WITH CHECK (is_member_of_workspace(workspace_id));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_data_updated_at
  BEFORE UPDATE ON public.market_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();