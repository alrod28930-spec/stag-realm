import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, isWorkspaceAdmin, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "license-generate";

function newKey() {
  const s = crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
  return `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

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
    const meta = body?.metadata ?? {};
    const key = newKey();

    const { error } = await supabase.from("license_keys").insert({
      key,
      status: "unused",
      metadata: meta
    });
    
    if (error) return json({ ok: false, error: "insert_failed" });

    await repoEvent(supabase, workspace_id, FN, { ok: true, key });
    return json({ ok: true, key });
  } catch (e) {
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
