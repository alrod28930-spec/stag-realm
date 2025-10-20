import { useEffect, useState, useRef } from "react";
import { getCandles, Candle } from "@/integrations/supabase/candles";
import { resolveWorkspaceId } from "@/lib/workspace";
import { normalizeTf } from "@/lib/timeframes";
import { logService } from "@/services/logging";

export function useCandles(wsId: string, symbol: string, tf: string) {
  const [state, setState] = useState<"loading" | "ready" | "degraded">("loading");
  const [rows, setRows] = useState<Candle[]>([]);
  const cachedRowsRef = useRef<Candle[]>([]);
  
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
    setState("loading");
    
    (async () => {
      try {
        const now = new Date();
        const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // last 90 days
        const data = await getCandles(validWsId, symbol, normalizedTf, from.toISOString(), now.toISOString());
        
        if (!alive) return;
        
        if (data && data.length > 0) { 
          cachedRowsRef.current = data; // Update cache
          setRows(data); 
          setState("ready"); 
        } else { 
          // Use cached data if available, otherwise show degraded state
          if (cachedRowsRef.current.length > 0) {
            setRows(cachedRowsRef.current);
          }
          setState("degraded"); 
        }
      } catch (error) {
        if (!alive) return;
        
        logService.log("error", "useCandles fetch error", { error, symbol, tf });
        
        // Use cached data on error
        if (cachedRowsRef.current.length > 0) {
          setRows(cachedRowsRef.current);
        }
        setState("degraded");
      }
    })();
    
    return () => { alive = false; };
  }, [wsId, symbol, tf]);
  
  return { state, rows };
}
