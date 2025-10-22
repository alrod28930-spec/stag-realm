import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "license-activate";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";
  
  try {
    workspace_id = await ensureWorkspace(supabase);
    const body = await req.json().catch(() => ({}));
    const key = String(body?.key ?? "").trim().toUpperCase();
    
    if (!key) return json({ ok: false, error: "missing_key" });

    const { data: keys } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", key)
      .limit(1);
    
    const k = keys?.[0];
    if (!k) return json({ ok: false, error: "invalid_key" });
    if (k.status === "revoked") return json({ ok: false, error: "revoked_key" });

    // Link license to workspace (idempotent)
    await supabase.from("license_assignments").upsert({ key, workspace_id });

    // Mark key active
    await supabase.from("license_keys").update({ status: "active" }).eq("key", key);

    // Enable feature flags using existing JSONB structure
    const { data: existingFlags } = await supabase
      .from("feature_flags")
      .select("flags")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const currentFlags = (existingFlags?.flags as Record<string, boolean>) || {};
    const updatedFlags = {
      ...currentFlags,
      live_trading: true,
      oracle_expanded: true,
      bots_enabled: true,
      learning_enabled: true
    };

    await supabase.from("feature_flags").upsert({
      workspace_id,
      flags: updatedFlags,
      updated_at: new Date().toISOString()
    });

    const enabledFlags = Object.keys(updatedFlags).filter(k => updatedFlags[k]);
    await repoEvent(supabase, workspace_id, FN, { ok: true, key, flags: enabledFlags });
    return json({ ok: true, key, flags: enabledFlags });
  } catch (e) {
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
