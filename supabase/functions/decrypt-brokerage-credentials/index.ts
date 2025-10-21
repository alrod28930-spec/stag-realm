import { serve } from "https://deno.land/std/http/server.ts";
import { json, handleCORS } from "../_shared/supa.ts";

serve(async (req) => {
  const cors = handleCORS(req); 
  if (cors) return cors;
  
  try {
    const { broker, mode = "paper" } = await req.json().catch(() => ({}));
    
    if (broker !== "alpaca") {
      return json({ ok: false, error: "unsupported_broker" }, 400);
    }

    const keyVar = mode === "live" ? "ALPACA_API_KEY_LIVE" : "ALPACA_API_KEY";
    const secVar = mode === "live" ? "ALPACA_SECRET_KEY_LIVE" : "ALPACA_SECRET_KEY";
    const apiKey = Deno.env.get(keyVar);
    const secretKey = Deno.env.get(secVar);
    
    if (!apiKey || !secretKey) {
      return json({ ok: false, error: "missing_credentials" }, 400);
    }

    return json({ 
      ok: true, 
      success: true,
      broker, 
      mode, 
      credentials: { 
        apiKey, 
        secretKey,
        api_key: apiKey,
        secret_key: secretKey 
      } 
    });
  } catch (e) {
    return json({ 
      ok: false, 
      error: "exception", 
      detail: (e as Error).message 
    }, 500);
  }
});
