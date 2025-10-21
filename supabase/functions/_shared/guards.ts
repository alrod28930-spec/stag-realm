import { json } from "./http.ts";

export async function ensureWorkspace(supabase: any) {
  const { data, error } = await supabase.rpc("ensure_default_workspace");
  if (error || !data) throw new Error("no_workspace");
  return data as string;
}

export function isSubsEnforced() {
  return (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") === "true");
}

export async function requireEntitlementOrBypass(
  supabase: any,
  workspace_id: string,
  key: string
) {
  // If enforcement is OFF, bypass
  if (!isSubsEnforced()) return { ok: true, bypass: true };
  
  // Otherwise check entitlement; return ok:false if missing
  const { data, error } = await supabase
    .from("workspace_entitlements")
    .select("entitlement_key")
    .eq("workspace_id", workspace_id)
    .eq("entitlement_key", key)
    .limit(1);
  
  if (error) return { ok: false, error: "entitlement_query_error" };
  if (!data?.length) return { ok: false, error: "entitlement_missing", key };
  return { ok: true, bypass: false };
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

