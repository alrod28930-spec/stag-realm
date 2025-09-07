import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface SubscriptionData {
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export interface BillingInvoice {
  id: string;
  stripe_invoice_id: string;
  amount_total: number;
  currency: string;
  hosted_invoice_url: string | null;
  created_at: string;
}

export function useSubscription(workspaceId: string | undefined) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchSubscriptionData = async () => {
    if (!workspaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription and customer data
      const { data: subData, error: subError } = await supabase
        .from('billing_subscriptions')
        .select(`
          plan_code,
          status,
          current_period_end,
          cancel_at_period_end,
          billing_customers!inner(stripe_customer_id)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) throw subError;

      // Fetch invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (invoiceError) throw invoiceError;

      const latestSub = subData?.[0];
      setSubscription({
        planCode: latestSub?.plan_code || null,
        status: latestSub?.status || null,
        currentPeriodEnd: latestSub?.current_period_end || null,
        cancelAtPeriodEnd: latestSub?.cancel_at_period_end || false,
        stripeCustomerId: (latestSub as any)?.billing_customers?.stripe_customer_id || null,
      });

      setInvoices(invoiceData || []);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (priceId: string, trialDays?: number) => {
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        workspace_id: workspaceId,
        price_id: priceId,
        trial_days: trialDays,
        mode: 'subscription'
      }
    });

    if (error) throw error;
    return data.url;
  };

  const createPortalSession = async () => {
    if (!workspaceId) throw new Error('No workspace selected');

    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        workspace_id: workspaceId
      }
    });

    if (error) throw error;
    return data.url;
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [workspaceId, user]);

  return {
    subscription,
    invoices,
    loading,
    error,
    refetch: fetchSubscriptionData,
    createCheckoutSession,
    createPortalSession,
  };
}