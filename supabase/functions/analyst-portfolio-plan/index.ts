/**
 * Phase IV: Portfolio-Level Planner (Analyst v3)
 * Generates allocation-aware plans across multiple symbols
 */

import { serve } from "https://deno.land/std/http/server.ts";
import { supaFromReq, json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";
import { recordEvent } from "../_shared/metrics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = supaFromReq(req);
    const workspace_id = await ensureWorkspace(supabase);
    
    const { symbols = ["SPY", "QQQ", "META"], capital = 100000 } = await req.json();

    // Load hyperparameters
    const { data: hparams } = await supabase
      .from("analyst_hparams")
      .select("params")
      .eq("workspace_id", workspace_id)
      .single();
    
    const { risk_cap = 0.03 } = hparams?.params ?? {};

    // Load BID stats for symbols
    const { data: stats } = await supabase
      .from("bid_user_stats")
      .select("symbol, win_rate, avg_rr")
      .in("symbol", symbols)
      .eq("workspace_id", workspace_id);

    const baseStats = (!stats || stats.length === 0)
      ? symbols.map((sym: string) => ({ symbol: sym, win_rate: 0.5, avg_rr: 1.0 }))
      : stats;

    // Calculate allocation weights based on performance metrics
    const plans = baseStats.map((s: any) => {
      const win_rate = s.win_rate ?? 0.5;
      const avg_rr = s.avg_rr ?? 1.0;
      const volatility = (s as any).volatility ?? 0.02;
      
      // Weight by win rate and risk-reward, penalize by volatility
      const performance_score = (win_rate * avg_rr) / Math.max(volatility, 0.01);
      
      return {
        symbol: s.symbol,
        win_rate,
        avg_rr,
        volatility,
        performance_score
      };
    });

    // Normalize to allocations
    const totalScore = plans.reduce((sum, p) => sum + p.performance_score, 0);
    
    const allocations = plans.map(p => {
      const raw_alloc = (p.performance_score / totalScore) * risk_cap;
      const alloc = Math.min(raw_alloc, risk_cap / plans.length); // Cap individual allocation
      const size = capital * alloc;
      
      return {
        symbol: p.symbol,
        alloc: parseFloat(alloc.toFixed(4)),
        size: parseFloat(size.toFixed(2)),
        win_rate: p.win_rate,
        avg_rr: p.avg_rr,
        volatility: p.volatility
      };
    });

    const totalAlloc = allocations.reduce((sum, p) => sum + p.alloc, 0);

    // Record event
    await recordEvent(supabase, workspace_id, "portfolio_plan", {
      symbols,
      capital,
      totalAlloc,
      planCount: allocations.length
    });

    try {
      await supabase.from("execution_audit").insert({
        workspace_id,
        event: "portfolio_plan_generated",
        payload: { symbols, capital, totalAlloc, allocations }
      });
    } catch (_e) {
      // swallow audit errors
    }

    return json({ 
      ok: true, 
      totalAlloc: parseFloat(totalAlloc.toFixed(4)),
      plans: allocations,
      capital,
      risk_cap,
      timestamp: new Date().toISOString()
    }, 200, corsHeaders);

  } catch (e) {
    console.error("Portfolio plan error:", e);
    
    return json({ 
      ok: false, 
      error: "exception", 
      detail: (e as Error).message 
    }, 500, corsHeaders);
  }
});
