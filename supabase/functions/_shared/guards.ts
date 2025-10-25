import { json } from "./http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

/**
 * Create a user-scoped Supabase client from the request (RLS aware)
 */
export function supaUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: missing or invalid Authorization header");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("Unauthorized: empty bearer token");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("Server misconfig: missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

/**
 * Ensure workspace exists for the authenticated user
 * Uses user-scoped client so RPC has proper auth context
 */
export async function ensureWorkspace(req: Request) {
  try {
    const supabase = supaUserClient(req);
    
    // Get current user (validates token)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth failed:', authError?.message);
      throw new Error(`Unauthorized: ${authError?.message || 'No user'}`);
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Ensure workspace exists (RPC now has user context via auth.uid())
    const { data, error } = await supabase.rpc("ensure_default_workspace");
    if (error) {
      console.error('❌ RPC failed:', error);
      throw new Error(`Workspace error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error("No workspace returned");
    }
    
    console.log('✅ Workspace:', data);
    return { workspaceId: data as string, userId: user.id, supabase };
  } catch (e) {
    console.error('❌ ensureWorkspace error:', e);
    throw e;
  }
}

/** 
 * SECURITY FIX: bind admin check to current user to prevent privilege escalation
 */
export async function isWorkspaceAdmin(
  supabase: any,
  workspace_id: string
) {
  // Get current user ID
  const { data: who } = await supabase.auth.getUser();
  const userId = who?.user?.id;
  
  if (!userId) {
    return false;
  }

  // Check if THIS user is admin/owner for the workspace
  const { data: me } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace_id)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const role = me?.role ?? "member";
  return role === "owner" || role === "admin";
}

/** 
 * Prefer the hardened recorder_log RPC; fallback only if needed 
 */
export async function repoEvent(
  supabase: any,
  workspace_id: string,
  source: string,
  payload: any
) {
  try {
    const { error } = await supabase.rpc("recorder_log", {
      p_workspace: workspace_id,
      p_event_type: source,
      p_severity: 2,
      p_entity_type: "system",
      p_entity_id: null,
      p_summary: source,
      p_payload: payload as any,
    });
    if (error) {
      // Fallback to direct insert if RPC fails
      await supabase.from("repository_events").insert({ 
        workspace_id, 
        source, 
        payload 
      });
    }
  } catch {
    // swallow to avoid masking original response
  }
}

/** 
 * Return an appropriate status code for failures (not 200)
 */
export function safeFail(fnName: string, e: any, status = 400) {
  const msg = (e && e.message) ? e.message : String(e);
  const detail = msg.slice(0, 500);
  const code = Number.isInteger(status) && status >= 400 && status < 600 ? status : 400;
  return json({ ok: false, error: "exception", fn: fnName, detail }, code);
}

