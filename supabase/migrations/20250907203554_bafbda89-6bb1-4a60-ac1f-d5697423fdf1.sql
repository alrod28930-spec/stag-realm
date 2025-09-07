-- Create billing tables for workspace-scoped Stripe integration

-- Helper functions for workspace ownership (if not exists)
CREATE OR REPLACE FUNCTION public.is_owner_of_workspace(w_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = w_id AND w.owner_id = auth.uid()
  )
$$;

-- Link a workspace to a Stripe customer
CREATE TABLE IF NOT EXISTS public.billing_customers (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_customers
CREATE POLICY "billing_customers_select" ON public.billing_customers
  FOR SELECT USING (is_member_of_workspace(workspace_id));

CREATE POLICY "billing_customers_insert" ON public.billing_customers
  FOR INSERT WITH CHECK (is_owner_of_workspace(workspace_id));

CREATE POLICY "billing_customers_update" ON public.billing_customers
  FOR UPDATE USING (is_owner_of_workspace(workspace_id));

-- Subscription tracking
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  plan_code text NOT NULL, -- 'lite'|'standard'|'pro'|'elite'
  status text NOT NULL,    -- 'active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid'
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_subscriptions
CREATE POLICY "billing_subscriptions_select" ON public.billing_subscriptions
  FOR SELECT USING (is_member_of_workspace(workspace_id));

CREATE POLICY "billing_subscriptions_insert" ON public.billing_subscriptions
  FOR INSERT WITH CHECK (is_owner_of_workspace(workspace_id));

CREATE POLICY "billing_subscriptions_update" ON public.billing_subscriptions
  FOR UPDATE USING (is_owner_of_workspace(workspace_id));

-- Invoice tracking
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  hosted_invoice_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policy for billing_invoices (read-only for workspace members)
CREATE POLICY "billing_invoices_select" ON public.billing_invoices
  FOR SELECT USING (is_member_of_workspace(workspace_id));

-- Add update trigger for billing_subscriptions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_subscriptions_updated_at
    BEFORE UPDATE ON public.billing_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();