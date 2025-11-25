import { useEffect, useState } from "react";
import { getCandles } from "@/integrations/supabase/candles";

export function useCandles(wsId: string, symbol: string, tf: string) {
  const [state, setState] = useState<"loading" | "ready" | "degraded">("loading");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const now = new Date(); const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const data = await getCandles(wsId, symbol, tf, from.toISOString(), now.toISOString());
      if (!alive) return;
      if (data.length) { setRows(data); setState("ready"); } else { setRows([]); setState("degraded"); }
    })();
    return () => { alive = false; };
  }, [wsId, symbol, tf]);
  return { state, rows };
}
