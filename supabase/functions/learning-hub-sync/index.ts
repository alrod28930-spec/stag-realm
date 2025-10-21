import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { recordEvent } from "../_shared/metrics.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Learning Hub Sync
 * Reads repository_events, enqueues learning jobs based on activity
 */

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const workspace_id = await ensureWorkspace(supabase);

    const sinceISO = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // last 24h
    const { data: events } = await supabase
      .from("repository_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("ts", sinceISO)
      .order("ts", { ascending: true });

    // Heuristic: if fills + signals exist, enqueue online update
    const hasFills = events?.some((e: any) => e.payload?.event_type === "order.filled");
    const hasSignals = events?.some((e: any) => e.source === "oracle");

    const jobs: any[] = [];
    if (hasFills) jobs.push({ workspace_id, job_type: "bid_aggregate", payload: {} });
    if (hasFills && hasSignals) jobs.push({ workspace_id, job_type: "oracle_online_update", payload: {} });

    if (jobs.length) {
      await supabase.from("learning_jobs").insert(jobs);
    }

    await recordEvent(supabase, workspace_id, "learning_hub_sync", { queued: jobs.length });
    return json({ ok: true, queued: jobs.length });
  } catch (err) {
    console.error("[learning-hub-sync] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
