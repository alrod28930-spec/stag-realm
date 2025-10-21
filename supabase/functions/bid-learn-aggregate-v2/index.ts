import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BID Learning Aggregation v2
 * Aggregates bid_learning_events → bid_user_stats
 * Derives patterns and success rates
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

    console.log(`[bid-learn-aggregate-v2] workspace_id=${workspace_id}`);

    // Query last 30 days of learning events
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: events, error: eventsError } = await supabase
      .from("bid_learning_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("ts", thirtyDaysAgo);

    if (eventsError) {
      console.error("[bid-learn-aggregate-v2] events error:", eventsError);
      return json({ ok: false, error: eventsError.message }, 400);
    }

    // Group by user_id, symbol, tf
    const groups = new Map<string, any[]>();
    
    (events || []).forEach((event) => {
      const key = `${event.user_id}|${event.symbol}|${event.tf}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    });

    // Aggregate stats per group
    const statsRows: any[] = [];

    for (const [key, groupEvents] of groups.entries()) {
      const [user_id, symbol, tf] = key.split("|");
      
      // Filter filled orders
      const filled = groupEvents.filter((e) => e.event_type === "order.filled");
      const trades = filled.length;
      
      if (trades === 0) continue;

      // Calculate win rate
      const wins = filled.filter((e) => (e.pnl ?? 0) > 0).length;
      const win_rate = wins / trades;

      // Calculate avg risk-reward (placeholder logic)
      const avgPnl = filled.reduce((sum, e) => sum + (e.pnl ?? 0), 0) / trades;
      const avg_rr = avgPnl > 0 ? 1.2 : 0.8; // Simplified

      // Calculate avg hold time (placeholder)
      const avg_hold_minutes = 45;

      statsRows.push({
        workspace_id,
        user_id,
        symbol,
        tf,
        trades,
        win_rate,
        avg_rr,
        avg_hold_minutes,
        last_updated: new Date().toISOString(),
      });
    }

    // Upsert to bid_user_stats
    if (statsRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("bid_user_stats")
        .upsert(statsRows);

      if (upsertError) {
        console.error("[bid-learn-aggregate-v2] upsert error:", upsertError);
        return json({ ok: false, error: upsertError.message }, 400);
      }

      // Log to repository
      await supabase.from("repository_events").insert({
        workspace_id,
        source: "bid",
        payload: { event: "stats_aggregated", count: statsRows.length },
      });
    }

    return json({
      ok: true,
      updated: statsRows.length,
      stats: statsRows,
    });
  } catch (err) {
    console.error("[bid-learn-aggregate-v2] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
