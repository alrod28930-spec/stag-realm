import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, isWorkspaceAdmin, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "license-revoke";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";
  
  try {
    workspace_id = await ensureWorkspace(supabase);
    const admin = await isWorkspaceAdmin(supabase, workspace_id);
    if (!admin) return json({ ok: false, error: "forbidden" });

    const body = await req.json().catch(() => ({}));
    const key = String(body?.key ?? "").trim().toUpperCase();
    
    if (!key) return json({ ok: false, error: "missing_key" });

    await supabase.from("license_keys").update({ status: "revoked" }).eq("key", key);
    await supabase.from("license_assignments").delete().eq("key", key);
    
    await repoEvent(supabase, workspace_id, FN, { ok: true, key });
    return json({ ok: true, key });
  } catch (e) {
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
