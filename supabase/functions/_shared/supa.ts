import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function supaFromReq(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

export function json(body: any, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      ...extraHeaders,
    },
  });
}

export function handleCORS(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      },
    });
  }
  return null;
}

export async function ensureWorkspace(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc("ensure_default_workspace");
  if (error) throw new Error("workspace:" + error.message);
  return data as string;
}

export const ENFORCE_SUBS =
  (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") ?? "false").toLowerCase() === "true";
