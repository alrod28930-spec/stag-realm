import { json } from "./http.ts";

export async function ensureWorkspace(supabase: any, req: Request) {
  try {
    // Extract JWT token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No Authorization header');
      throw new Error('Unauthorized: No Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('❌ Invalid Authorization header format');
      throw new Error('Unauthorized: Invalid Authorization header');
    }
    
    // Verify user with explicit token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ Auth check failed:', authError?.message);
      throw new Error(`Unauthorized: ${authError?.message || 'No user session'}`);
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Then ensure workspace exists
    const { data, error } = await supabase.rpc("ensure_default_workspace");
    if (error) {
      console.error('❌ RPC ensure_default_workspace failed:', error);
      throw new Error(`Workspace creation failed: ${error.message}`);
    }
    
    if (!data) {
      throw new Error("no_workspace: RPC returned null");
    }
    
    console.log('✅ Workspace ensured:', data);
    return data as string;
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

