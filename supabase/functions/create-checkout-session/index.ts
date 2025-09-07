import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { workspace_id, price_id, coupon, trial_days, mode = 'subscription' } = await req.json();
    
    if (!workspace_id || !price_id) {
      throw new Error("workspace_id and price_id are required");
    }

    logStep("Request validated", { workspace_id, price_id, user_id: user.id });

    // Check if user is workspace owner
    const { data: ownerCheck } = await supabaseClient.rpc('is_owner_of_workspace', { w_id: workspace_id });
    if (!ownerCheck) {
      throw new Error("Only workspace owners can manage billing");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    let customerId: string;
    const { data: existingCustomer } = await supabaseClient
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace_id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
      logStep("Using existing customer", { customerId });
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          workspace_id: workspace_id,
          user_id: user.id
        }
      });
      customerId = customer.id;

      // Store in database
      await supabaseClient
        .from('billing_customers')
        .upsert({
          workspace_id: workspace_id,
          stripe_customer_id: customerId
        });

      logStep("Created new customer", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const sessionParams: any = {
      mode: mode,
      customer: customerId,
      client_reference_id: workspace_id,
      line_items: [{
        price: price_id,
        quantity: 1
      }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      success_url: `${origin}/subscription?success=1&ws=${workspace_id}`,
      cancel_url: `${origin}/subscription?canceled=1&ws=${workspace_id}`
    };

    if (coupon) {
      sessionParams.discounts = [{ coupon: coupon }];
    }

    if (trial_days && mode === 'subscription') {
      sessionParams.subscription_data = {
        trial_period_days: trial_days
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Log the checkout start event
    await supabaseClient.rpc('recorder_log', {
      p_workspace: workspace_id,
      p_event_type: 'billing.checkout.start',
      p_severity: 1,
      p_entity_type: 'billing',
      p_entity_id: workspace_id,
      p_summary: 'Checkout session started',
      p_payload: { price_id, mode, trial_days }
    });

    return new Response(JSON.stringify({ url: session.url }), {
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