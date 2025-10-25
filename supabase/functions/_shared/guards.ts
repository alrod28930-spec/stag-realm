import { json } from "./http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

/**
 * Create a user-scoped Supabase client from the request
 * This client will have the user's auth context for RLS policies
 */
export function supaUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No Authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Invalid Authorization header format');
  }
  
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Create client with user's JWT token
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false
    }
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

export async function isWorkspaceAdmin(supabase: any, workspace_id: string) {
  const { data } = await supabase
    .from("workspace_members")
    .select("role").eq("workspace_id", workspace_id).limit(1);
  const role = data?.[0]?.role ?? "member";
  return role === "owner" || role === "admin";
}

export async function repoEvent(
  supabase: any,
  workspace_id: string,
  source: string,
  payload: any
) {
  try {
    await supabase.from("repository_events").insert({
      workspace_id,
      source,
      payload
    });
  } catch (_e) {
    // swallow to avoid masking original response
  }
}

export function safeFail(fnName: string, e: any) {
  const msg = (e && e.message) ? e.message : String(e);
  const detail = msg.slice(0, 500);
  return json({ ok: false, error: "exception", fn: fnName, detail }, 200);
}

