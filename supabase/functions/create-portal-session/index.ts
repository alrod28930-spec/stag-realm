import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PORTAL] ${step}${detailsStr}`);
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

    const { workspace_id } = await req.json();
    
    if (!workspace_id) {
      throw new Error("workspace_id is required");
    }

    logStep("Request validated", { workspace_id, user_id: user.id });

    // Check if user is workspace owner
    const { data: ownerCheck } = await supabaseClient.rpc('is_owner_of_workspace', { w_id: workspace_id });
    if (!ownerCheck) {
      throw new Error("Only workspace owners can manage billing");
    }

    // Get Stripe customer ID
    const { data: customer } = await supabaseClient
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace_id)
      .single();

    if (!customer?.stripe_customer_id) {
      throw new Error("No billing customer found for this workspace");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Create portal session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const returnUrl = Deno.env.get("VITE_BILLING_PORTAL_RETURN_URL") || `${origin}/subscription`;
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl
    });
    
    logStep("Portal session created", { sessionId: portalSession.id, url: portalSession.url });

    // Log the portal open event
    await supabaseClient.rpc('recorder_log', {
      p_workspace: workspace_id,
      p_event_type: 'billing.portal.opened',
      p_severity: 1,
      p_entity_type: 'billing',
      p_entity_id: workspace_id,
      p_summary: 'Customer portal opened',
      p_payload: { customer_id: customer.stripe_customer_id }
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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