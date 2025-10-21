import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function cors(json = false) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

export function preflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }
  return null;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(true) });
}

export function supaFromReq(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });
}
