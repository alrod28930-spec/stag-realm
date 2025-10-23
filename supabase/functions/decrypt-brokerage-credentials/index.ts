import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace, repoEvent, safeFail } from "../_shared/guards.ts";

const FN = "decrypt-brokerage-credentials";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  let workspace_id = "";

  try {
    workspace_id = await ensureWorkspace(supabase, req);
    
    const body = await req.json().catch(() => ({}));
    const { broker = "alpaca", mode = "paper" } = body;
    
    console.log(`🔓 Decrypt request - workspace: ${workspace_id}, broker: ${broker}, mode: ${mode}`);

    // Env-mode fallback for development
    const apiKey = Deno.env.get("ALPACA_API_KEY");
    const secretKey = Deno.env.get("ALPACA_SECRET_KEY");
    
    if (!apiKey || !secretKey) {
      await repoEvent(supabase, workspace_id, FN, { ok: false, error: "missing_env_keys" });
      return json({ ok: false, error: "missing_env_keys" });
    }

    console.log("✅ Using env credentials (dev mode)");
    await repoEvent(supabase, workspace_id, FN, { ok: true, mode: "env" });
    
    return json({
      ok: true,
      credentials: {
        apiKey,
        secretKey,
        api_key: apiKey,
        secret_key: secretKey
      },
      mode: "env"
    });
  } catch (e) {
    console.error("[decrypt] Error:", e);
    await repoEvent(supabase, workspace_id || "00000000-0000-0000-0000-000000000000", `${FN}:error`, { message: (e as Error).message });
    return safeFail(FN, e);
  }
});
