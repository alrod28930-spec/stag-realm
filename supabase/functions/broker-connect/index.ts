import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "broker-connect";
const BASE = {
  paper: "https://paper-api.alpaca.markets",
  live: "https://api.alpaca.markets"
};

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";
  
  try {
    workspace_id = await ensureWorkspace(supabase);

    // Get credentials from decrypt endpoint
    const dec = await fetch(
      new URL(req.url).origin + "/functions/v1/decrypt-brokerage-credentials",
      { method: "POST", headers: req.headers }
    ).then(r => r.json());
    
    if (!dec?.ok) {
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "decrypt_failed" });
      return json({ ok: false, error: "decrypt_failed" });
    }

    const mode = (dec.mode ?? "paper").toLowerCase();
    const url = BASE[mode as "paper" | "live"];

    console.log(`🔌 Testing ${mode} connection...`);

    // Test connection
    const r = await fetch(`${url}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": dec.apiKey,
        "APCA-API-SECRET-KEY": dec.secret
      }
    });
    
    const ok = r.ok;
    const acct = ok ? await r.json() : null;
    const status = ok ? "connected" : "error";

    // Store in broker_links
    await supabase.from("broker_links").upsert({
      workspace_id,
      broker: "alpaca",
      mode,
      status,
      last_ok: ok ? new Date().toISOString() : null,
      meta: { buying_power: acct?.buying_power, account_id: acct?.id }
    });

    // Store health cache
    await supabase.from("broker_health").upsert({
      workspace_id,
      broker: "alpaca",
      mode,
      status: ok ? "ok" : "down",
      last_check: new Date().toISOString(),
      error_message: ok ? null : `status ${r.status}`
    });

    await repoEvent(supabase, workspace_id, FN, { ok, mode, bp: acct?.buying_power });
    
    return json({
      ok,
      mode,
      account: ok ? { id: acct?.id, bp: acct?.buying_power } : null
    });
  } catch (e) {
    console.error('💥 broker-connect error:', e);
    await repoEvent(supabase, workspace_id, `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
