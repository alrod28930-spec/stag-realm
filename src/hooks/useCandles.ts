import { useEffect, useState } from "react";
import { getCandles } from "@/integrations/supabase/candles";
import { resolveWorkspaceId } from "@/lib/workspace";
import { normalizeTf } from "@/lib/timeframes";

export function useCandles(wsId: string, symbol: string, tf: string) {
  const [state, setState] = useState<"loading" | "ready" | "degraded">("loading");
  const [rows, setRows] = useState<any[]>([]);
  
  useEffect(() => {
    // Ensure we have a valid workspace ID
    const validWsId = resolveWorkspaceId(wsId);
    if (!validWsId) {
      setState("degraded");
      return;
    }

    // Normalize timeframe
    const normalizedTf = normalizeTf(tf);
    
    let alive = true;
    (async () => {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days
      const data = await getCandles(validWsId, symbol, normalizedTf, from.toISOString(), now.toISOString());
      if (!alive) return;
      if (data.length) { 
        setRows(data); 
        setState("ready"); 
      } else { 
        // Don't clear rows - keep last good data visible
        setState("degraded"); 
      }
    })();
    return () => { alive = false; };
  }, [wsId, symbol, tf]);
  
  return { state, rows };
}
