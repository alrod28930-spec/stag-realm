import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { PlanCard, Plan } from '@/components/subscription/PlanCard';
import { BillingManagement } from '@/components/subscription/BillingManagement';
import { isDemoMode } from '@/utils/demoMode';
import { Shield, AlertTriangle } from 'lucide-react';

// Plan configurations - using placeholder price IDs that should be configured when Stripe is set up
const PLANS: Plan[] = [
  {
    code: 'lite',
    name: 'Lite',
    price: 49,
    description: 'Perfect for getting started with algorithmic trading',
    features: [
      { name: 'Analyst AI Assistant', included: true },
      { name: 'Demo Mode Access', included: true },
      { name: 'Paper Trading', included: true },
      { name: 'Basic Market Data', included: true },
      { name: 'Community Support', included: true },
      { name: 'Live Trading', included: false },
      { name: 'Advanced Analytics', included: false },
    ],
    priceId: 'price_lite_placeholder', // TODO: Replace with actual Stripe price ID
  },
  {
    code: 'standard',
    name: 'Standard',
    price: 99,
    description: 'Unlock live trading and core automation features',
    popular: true,
    trial: 7,
    features: [
      { name: 'Everything in Lite', included: true },
      { name: 'Live Trading Access', included: true },
      { name: 'Trading Desk Interface', included: true },
      { name: 'Core Trade Bots', included: true },
      { name: 'Basic Oracle Signals', included: true },
      { name: 'Risk Management Tools', included: true },
      { name: 'Advanced Features', included: false },
    ],
    priceId: 'price_standard_placeholder', // TODO: Replace with actual Stripe price ID
  },
  {
    code: 'pro',
    name: 'Pro',
    price: 199,
    description: 'Advanced trading capabilities for serious traders',
    features: [
      { name: 'Everything in Standard', included: true },
      { name: 'Day Trading Mode', included: true },
      { name: 'Advanced Oracle & Seeker', included: true },
      { name: 'Brokerage Dock Integration', included: true },
      { name: 'Custom Strategy Builder', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Advanced Analytics', included: true },
    ],
    priceId: 'price_pro_placeholder', // TODO: Replace with actual Stripe price ID
  },
  {
    code: 'elite',
    name: 'Elite',
    price: 299,
    description: 'The ultimate trading platform for professionals',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'White-Glove Onboarding', included: true },
      { name: 'Dedicated Support Channel', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'Advanced Reporting', included: true },
      { name: 'V2 Platform Preview', included: true },
      { name: 'API Access', included: true },
    ],
    priceId: 'price_elite_placeholder', // TODO: Replace with actual Stripe price ID
  },
];

export default function Subscription() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // TODO: Get these from workspace context when implemented
  const workspaceId = undefined; // Disabled until workspace system is implemented
  const isWorkspaceOwner = true; 
  const workspaceName = 'My Workspace';
  const demoMode = isDemoMode();

  const {
    subscription,
    invoices,
    loading: subscriptionLoading,
    error,
    refetch,
    createCheckoutSession,
    createPortalSession,
  } = useSubscription(workspaceId);

  // Handle success/cancel from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === '1') {
      toast({
        title: "Subscription successful!",
        description: "Your subscription has been activated. Welcome to StagAlgo!",
      });
      refetch();
      // Clean up URL
      setSearchParams({});
    } else if (canceled === '1') {
      toast({
        title: "Subscription canceled",
        description: "You can return anytime to complete your subscription.",
        variant: "destructive",
      });
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetch]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!isWorkspaceOwner) {
      toast({
        title: "Access denied",
        description: "Only workspace owners can manage billing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const checkoutUrl = await createCheckoutSession(plan.priceId || '', plan.trial);
      // Open in same tab for better UX
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: "Failed to start checkout",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      const portalUrl = await createPortalSession();
      window.open(portalUrl, '_blank');
    } catch (err) {
      console.error('Portal error:', err);
      toast({
        title: "Failed to open customer portal",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeFromDemo = () => {
    // Scroll to plans section
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/lovable-uploads/51874fc9-b200-43b9-9528-5946c7fbb0d9.png" alt="StagAlgo" className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your StagAlgo subscription, billing, and access premium trading features.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-full">
        <div className="space-y-8">
          {/* Current Status */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            <SubscriptionStatus
              planCode={subscription?.planCode}
              status={subscription?.status}
              currentPeriodEnd={subscription?.currentPeriodEnd}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
              workspaceName={workspaceName}
              isDemoMode={demoMode}
              onSubscribe={handleSubscribeFromDemo}
            />
          </section>

          {/* Subscription Plans */}
          <section id="plans-section">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Select the plan that fits your trading needs. Upgrade or downgrade anytime.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  currentPlan={subscription?.planCode}
                  onSelect={handleSelectPlan}
                  disabled={loading || subscriptionLoading || !isWorkspaceOwner}
                />
              ))}
            </div>
          </section>

          {/* Billing Management */}
          <section>
            <BillingManagement
              invoices={invoices}
              hasActiveSubscription={hasActiveSubscription}
              onManagePayment={handleOpenPortal}
              onOpenPortal={handleOpenPortal}
              isOwner={isWorkspaceOwner}
            />
          </section>

          {/* Compliance Footer */}
          <Card className="border-muted bg-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">Important Disclaimers:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• StagAlgo is software only. We do not hold funds or provide investment advice.</li>
                    <li>• All trading results are hypothetical and past performance does not guarantee future results.</li>
                    <li>• Trading involves substantial risk of loss and is not suitable for all investors.</li>
                    <li>• You are solely responsible for your trading decisions and compliance with applicable regulations.</li>
                    <li>• Subscription fees are non-refundable except as required by law.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}