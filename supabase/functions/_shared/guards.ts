import { json } from "./http.ts";

export async function ensureWorkspace(supabase: any) {
  const { data, error } = await supabase.rpc("ensure_default_workspace");
  if (error || !data) throw new Error("no_workspace");
  return data as string;
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

