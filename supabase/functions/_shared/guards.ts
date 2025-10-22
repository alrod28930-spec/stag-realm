import { json } from "./http.ts";

export async function ensureWorkspace(supabase: any) {
  const { data, error } = await supabase.rpc("ensure_default_workspace");
  if (error || !data) throw new Error("no_workspace");
  return data as string;
}

export function isSubsEnforced() {
  return (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") ?? "false").toLowerCase() === "true";
}

export async function requireEntitlementOrBypass(
  supabase: any,
  workspace_id: string,
  key: string
) {
  // ALWAYS bypass - subscriptions removed, replaced with roles + feature flags
  return { ok: true, bypass: true };
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

