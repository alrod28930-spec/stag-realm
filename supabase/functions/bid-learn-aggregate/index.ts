import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BID Learn Aggregate - Compute user stats from learning events
 * Aggregates bid_learning_events into bid_user_stats
 * Calculates win_rate, avg_rr, avg_hold_minutes per user/symbol/tf
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

    // Parse request
    const body = await req.json();
    const { user_id, symbol, tf } = body;

    // Ensure workspace
    const workspace_id = await ensureWorkspace(supabase);

    console.log(`[bid-learn-aggregate] workspace_id=${workspace_id}, user_id=${user_id || "all"}, symbol=${symbol || "all"}, tf=${tf || "all"}`);

    // Build query for learning events
    let query = supabase
      .from("bid_learning_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .in("event_type", ["order.filled", "order.rejected"]);

    if (user_id) query = query.eq("user_id", user_id);
    if (symbol) query = query.eq("symbol", symbol);
    if (tf) query = query.eq("tf", tf);

    const { data: events, error } = await query;

    if (error) {
      console.error("[bid-learn-aggregate] query error:", error);
      return json({ ok: false, error: error.message }, 400);
    }

    // Group events by user_id, symbol, tf
    const groups = new Map<string, any[]>();

    for (const event of events || []) {
      const key = `${event.user_id}|${event.symbol}|${event.tf}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    // Compute stats for each group
    const updates: any[] = [];

    for (const [key, groupEvents] of groups) {
      const [userId, sym, timeframe] = key.split("|");
      
      // Filter filled orders (completed trades)
      const filledTrades = groupEvents.filter((e) => e.event_type === "order.filled" && e.pnl !== null);

      if (filledTrades.length === 0) continue;

      const trades = filledTrades.length;
      const wins = filledTrades.filter((e) => e.pnl > 0).length;
      const win_rate = wins / trades;

      // Calculate avg RR (simplified: using pnl ratio)
      const rrValues = filledTrades
        .map((e) => {
          const pnl = e.pnl || 0;
          const risk = Math.abs(e.payload?.risk || 100); // Default risk
          return pnl / risk;
        })
        .filter((r) => !isNaN(r) && isFinite(r));

      const avg_rr = rrValues.length > 0 
        ? rrValues.reduce((sum, r) => sum + r, 0) / rrValues.length 
        : 0;

      // Calculate avg hold time (simplified: using timestamps)
      const holdTimes = filledTrades
        .map((e) => {
          const entry = e.payload?.entry_time ? new Date(e.payload.entry_time).getTime() : null;
          const exit = e.ts ? new Date(e.ts).getTime() : null;
          if (entry && exit) return (exit - entry) / (1000 * 60); // minutes
          return null;
        })
        .filter((t) => t !== null);

      const avg_hold_minutes = holdTimes.length > 0
        ? holdTimes.reduce((sum: number, t: any) => sum + t, 0) / holdTimes.length
        : 0;

      updates.push({
        workspace_id,
        user_id: userId,
        symbol: sym,
        tf: timeframe,
        trades,
        win_rate,
        avg_rr,
        avg_hold_minutes,
        last_updated: new Date().toISOString(),
      });
    }

    // Upsert stats
    if (updates.length > 0) {
      const { error: upsertError } = await supabase
        .from("bid_user_stats")
        .upsert(updates, {
          onConflict: "workspace_id,user_id,symbol,tf",
        });

      if (upsertError) {
        console.error("[bid-learn-aggregate] upsert error:", upsertError);
        return json({ ok: false, error: upsertError.message }, 400);
      }
    }

    return json({
      ok: true,
      processed_events: events?.length || 0,
      updated_stats: updates.length,
      stats: updates,
    });
  } catch (err) {
    console.error("[bid-learn-aggregate] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
