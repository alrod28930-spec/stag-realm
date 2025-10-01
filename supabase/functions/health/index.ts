// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { searchParams } = new URL(req.url);
  const ws = searchParams.get("ws");

  const result: any = { status: "ok", last_sync: null, candles: {}, errors_24h: 0 };

  const { data: hb } = await sb.from("recorder_mirror").select("ts, payload").eq("actor", "oracle").eq("event_type", "sync.heartbeat").order("ts", { ascending: false }).limit(1);
  result.last_sync = hb?.[0]?.ts ?? null;

  if (ws) {
    const { data: rows } = await sb.from("candles").select("symbol, tf, ts").eq("workspace_id", ws).order("ts", { ascending: false }).limit(200);
    for (const r of rows ?? []) result.candles[`${r.symbol}:${r.tf}`] = r.ts;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb.from("recorder_mirror").select("*", { count: "exact", head: true }).gte("ts", since).in("event_type", ["sync.error", "order.error"]);
  result.errors_24h = count ?? 0;
  result.status = result.errors_24h > 0 ? "degraded" : "ok";

  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
});
