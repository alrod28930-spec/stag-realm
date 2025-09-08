import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FEATURE-GUARD] ${step}${detailsStr}`);
};

// Server-side feature guard middleware
export async function requireFeature(supabaseClient: any, workspaceId: string, feature: string, userId?: string) {
  logStep("Checking feature entitlement", { workspaceId, feature, userId });
  
  const { data: hasAccess, error } = await supabaseClient.rpc('has_entitlement', { 
    p_workspace: workspaceId, 
    p_feature: feature 
  });

  if (error) {
    logStep("ERROR checking entitlement", error);
    throw new Error(`Failed to check entitlement: ${error.message}`);
  }

  if (!hasAccess) {
    // Log denied access
    if (userId && workspaceId) {
      try {
        await supabaseClient.rpc('recorder_log', {
          p_workspace: workspaceId,
          p_event_type: 'locks.denied',
          p_severity: 2,
          p_entity_type: 'feature',
          p_entity_id: feature,
          p_summary: `Feature access denied: ${feature}`,
          p_payload: { 
            feature_code: feature,
            user_id: userId,
            workspace_id: workspaceId
          }
        });
      } catch (logError) {
        logStep("Failed to log access denial", logError);
      }
    }
    
    logStep("Feature access denied", { workspaceId, feature });
    throw new Error(`LOCKED_FEATURE:${feature}`);
  }

  logStep("Feature access granted", { workspaceId, feature });
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Feature guard request received");

    const { workspaceId, feature } = await req.json();
    
    if (!workspaceId || !feature) {
      throw new Error("Missing workspaceId or feature parameter");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extract user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid authorization token");
    }

    // Check feature entitlement
    await requireFeature(supabaseClient, workspaceId, feature, userData.user.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Access granted for feature: ${feature}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a locked feature error
    if (errorMessage.startsWith('LOCKED_FEATURE:')) {
      const feature = errorMessage.split(':')[1];
      return new Response(JSON.stringify({ 
        error: 'FEATURE_LOCKED',
        feature: feature,
        message: `Feature ${feature} is not available in your current plan` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR',
      message: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});