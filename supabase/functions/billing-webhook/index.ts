import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe price IDs to plan codes
const getPlanCodeFromPrice = (priceId: string): string => {
  const priceMap: Record<string, string> = {
    [Deno.env.get("STRIPE_PRICE_LITE") || ""]: "lite",
    [Deno.env.get("STRIPE_PRICE_STANDARD") || ""]: "standard", 
    [Deno.env.get("STRIPE_PRICE_PRO") || ""]: "pro",
    [Deno.env.get("STRIPE_PRICE_ELITE") || ""]: "elite"
  };
  
  return priceMap[priceId] || "unknown";
};

// Plan feature mapping for entitlements
const PLAN_FEATURES = {
  lite: ['DEMO_TRADING','ANALYST_BASIC','RECORDER_BASIC','CRADLE_SHEET'],
  standard: ['TRADING_DESK','BROKERAGE_DOCK','PORTFOLIO_MIRROR','CORE_BOTS','ORACLE_BASIC'],
  pro: ['ADV_BOTS','DAY_TRADE_MODE','ORACLE_EXPANDED','SEEKER','LEARNING_BOT','RECORDER_ADV','CRADLE_CODE'],
  elite: ['VOICE_ANALYST','WORLD_MARKETS','UNLIMITED_WORKSPACES','PRIORITY_SUPPORT'],
};

// Apply entitlements based on subscription plan
async function applyEntitlements(supabaseAdmin: any, workspaceId: string, planCode: string, active: boolean) {
  logStep("Applying entitlements", { workspaceId, planCode, active });
  
  // Reset all entitlements to false
  const allFeatures = Object.values(PLAN_FEATURES).flat();
  await supabaseAdmin
    .from('workspace_entitlements')
    .upsert(allFeatures.map(code => ({
      workspace_id: workspaceId,
      feature_code: code,
      enabled: false,
      source: 'subscription'
    })));

  if (active && PLAN_FEATURES[planCode as keyof typeof PLAN_FEATURES]) {
    const enabledFeatures = [...PLAN_FEATURES[planCode as keyof typeof PLAN_FEATURES]];
    
    // Include all lower-tier features
    if (planCode === 'standard') enabledFeatures.push(...PLAN_FEATURES.lite);
    if (planCode === 'pro') enabledFeatures.push(...PLAN_FEATURES.lite, ...PLAN_FEATURES.standard);
    if (planCode === 'elite') enabledFeatures.push(...PLAN_FEATURES.lite, ...PLAN_FEATURES.standard, ...PLAN_FEATURES.pro);
    
    await supabaseAdmin.from('workspace_entitlements').upsert(
      enabledFeatures.map(code => ({ 
        workspace_id: workspaceId, 
        feature_code: code, 
        enabled: true, 
        source: 'subscription' 
      }))
    );
    
    logStep("Entitlements applied", { workspaceId, enabledFeatures });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get workspace_id from customer
        const { data: customer } = await supabaseClient
          .from('billing_customers')
          .select('workspace_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (!customer) {
          logStep("No workspace found for customer", { customer_id: subscription.customer });
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const planCode = getPlanCodeFromPrice(priceId || "");

        await supabaseClient
          .from('billing_subscriptions')
          .upsert({
            workspace_id: customer.workspace_id,
            stripe_subscription_id: subscription.id,
            plan_code: planCode,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          });

        // Apply entitlements based on subscription status
        const isActive = ['active', 'trialing'].includes(subscription.status);
        await applyEntitlements(supabaseClient, customer.workspace_id, planCode, isActive);

        // Log subscription status change
        await supabaseClient.rpc('recorder_log', {
          p_workspace: customer.workspace_id,
          p_event_type: 'billing.subscription.status_changed',
          p_severity: 1,
          p_entity_type: 'billing',
          p_entity_id: subscription.id,
          p_summary: `Subscription ${subscription.status}`,
          p_payload: { status: subscription.status, plan_code: planCode }
        });

        logStep("Subscription updated", { 
          workspace_id: customer.workspace_id, 
          status: subscription.status,
          plan_code: planCode
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get workspace_id from subscription
        const { data: subData } = await supabaseClient
          .from('billing_subscriptions')
          .select('workspace_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        await supabaseClient
          .from('billing_subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        // Disable all entitlements for canceled subscription
        if (subData) {
          await applyEntitlements(supabaseClient, subData.workspace_id, 'lite', false);
        }

        logStep("Subscription deleted", { subscription_id: subscription.id });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Get workspace from subscription
          const { data: subscription } = await supabaseClient
            .from('billing_subscriptions')
            .select('workspace_id')
            .eq('stripe_subscription_id', invoice.subscription as string)
            .single();

          if (subscription) {
            await supabaseClient
              .from('billing_invoices')
              .insert({
                workspace_id: subscription.workspace_id,
                stripe_invoice_id: invoice.id,
                amount_total: invoice.amount_paid,
                currency: invoice.currency,
                hosted_invoice_url: invoice.hosted_invoice_url
              });

            // Log invoice paid
            await supabaseClient.rpc('recorder_log', {
              p_workspace: subscription.workspace_id,
              p_event_type: 'billing.invoice.paid',
              p_severity: 1,
              p_entity_type: 'billing',
              p_entity_id: invoice.id,
              p_summary: `Invoice paid: ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
              p_payload: { 
                amount: invoice.amount_paid, 
                currency: invoice.currency,
                invoice_url: invoice.hosted_invoice_url
              }
            });

            logStep("Invoice logged", { 
              workspace_id: subscription.workspace_id, 
              amount: invoice.amount_paid 
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          await supabaseClient
            .from('billing_subscriptions')
            .update({ 
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          logStep("Payment failed, subscription marked past due", { 
            subscription_id: invoice.subscription 
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});