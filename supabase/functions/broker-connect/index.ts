import { serve } from "https://deno.land/std/http/server.ts";
import { supaFromReq, json, handleCORS, ensureWorkspace, ENFORCE_SUBS } from "../_shared/supa.ts";

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;
  
  try {
    const supabase = supaFromReq(req);
    const workspace_id = await ensureWorkspace(supabase);

    if (ENFORCE_SUBS) {
      // Legacy entitlement checks if needed (currently bypassed)
    }

    const { broker = "alpaca", credentials, account_label, mode = "paper" } = await req.json().catch(() => ({}));
    
    if (!credentials) {
      return json({ ok: false, error: "missing_credentials" }, 400);
    }

    console.log(`🔌 Connecting ${broker} in ${mode} mode...`);

    // Test the connection
    const testResult = await testBrokerConnection(broker, mode, credentials);
    if (!testResult.ok) {
      return json({ 
        ok: false, 
        error: "connection_failed",
        message: testResult.message 
      }, 400);
    }

    // Store connection metadata (no raw secrets)
    const { error: upsertError } = await supabase
      .from("connections_brokerages")
      .upsert({
        workspace_id,
        provider: broker,
        status: "active",
        account_label: account_label || `${broker} ${mode} Account`,
        scope: { 
          account_type: mode,
          account_id: testResult.accountId
        },
        last_sync: new Date().toISOString()
      }, { onConflict: "workspace_id,provider" });

    if (upsertError) {
      return json({ 
        ok: false, 
        error: "link_store", 
        detail: upsertError.message 
      }, 400);
    }

    return json({ 
      ok: true, 
      workspace_id, 
      broker,
      status: "active",
      message: "Brokerage connected successfully"
    });
  } catch (e) {
    console.error('💥 broker-connect error:', e);
    return json({ 
      ok: false, 
      error: "exception", 
      detail: (e as Error).message 
    }, 500);
  }
});

async function testBrokerConnection(broker: string, mode: string, credentials: any) {
  if (broker !== "alpaca") {
    return { ok: false, message: "Unsupported broker" };
  }

  const baseUrl = mode === "live" 
    ? "https://api.alpaca.markets" 
    : "https://paper-api.alpaca.markets";

  try {
    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": credentials.api_key || credentials.apiKey,
        "APCA-API-SECRET-KEY": credentials.api_secret || credentials.apiSecret,
      },
    });

    if (!response.ok) {
      return { ok: false, message: `Authentication failed: ${response.status}` };
    }

    const account = await response.json();
    return { 
      ok: true, 
      accountId: account.account_number,
      message: "Connection successful" 
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
