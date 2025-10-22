import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "license-status";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";
  
  try {
    workspace_id = await ensureWorkspace(supabase);

    const { data: assigns } = await supabase
      .from("license_assignments")
      .select("key")
      .eq("workspace_id", workspace_id)
      .limit(1);
    
    const key = assigns?.[0]?.key ?? null;

    const { data: flagData } = await supabase
      .from("feature_flags")
      .select("flags")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const featureFlags = (flagData?.flags as Record<string, boolean>) || {};

    await repoEvent(supabase, workspace_id, FN, { ok: true, hasKey: !!key });
    return json({ ok: true, key, features: featureFlags });
  } catch (e) {
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
