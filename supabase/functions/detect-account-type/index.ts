import { serve } from "https://deno.land/std/http/server.ts";
import { supaFromReq, json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;
  
  try {
    const supabase = supaFromReq(req);
    const workspace_id = await ensureWorkspace(supabase);

    console.log('🔍 Testing account credentials...');
    
    const live = await probe("live");
    if (live.ok) {
      await storeConnection(supabase, workspace_id, "alpaca", "live", live.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        mode: "live",
        accountType: "live",
        account: live.account,
        message: "Connected to live trading account successfully"
      });
    }
    
    const paper = await probe("paper");
    if (paper.ok) {
      await storeConnection(supabase, workspace_id, "alpaca", "paper", paper.account);
      return json({ 
        ok: true, 
        broker: "alpaca", 
        mode: "paper",
        accountType: "paper",
        account: paper.account,
        message: "Connected to paper trading account successfully"
      });
    }
    
    return json({ 
      ok: false, 
      error: "authentication_failed",
      message: "Invalid API credentials. Please check your API key and secret."
    }, 401);
  } catch (e) {
    console.error('💥 Unexpected error:', e);
    return json({ 
      ok: false, 
      error: "exception", 
      detail: (e as Error).message 
    }, 500);
  }
});

async function probe(mode: "live" | "paper") {
  const keyVar = mode === "live" ? "ALPACA_API_KEY_LIVE" : "ALPACA_API_KEY";
  const secVar = mode === "live" ? "ALPACA_SECRET_KEY_LIVE" : "ALPACA_SECRET_KEY";
  const apiKey = Deno.env.get(keyVar);
  const secretKey = Deno.env.get(secVar);
  
  if (!apiKey || !secretKey) {
    return { ok: false, error: "missing_env" };
  }
  
  const base = mode === "live" 
    ? "https://api.alpaca.markets" 
    : "https://paper-api.alpaca.markets";
    
  try {
    const r = await fetch(`${base}/v2/account`, {
      headers: { 
        "APCA-API-KEY-ID": apiKey, 
        "APCA-API-SECRET-KEY": secretKey 
      }
    });
    
    if (!r.ok) {
      return { ok: false, error: String(r.status) };
    }
    
    return { ok: true, account: await r.json() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function storeConnection(supabase: any, workspace_id: string, broker: string, mode: string, accountInfo: any) {
  try {
    console.log('💾 Storing connection metadata...');
    
    const { error: upsertError } = await supabase
      .from('connections_brokerages')
      .upsert({
        workspace_id,
        provider: broker,
        status: 'active',
        account_label: `Alpaca ${mode.charAt(0).toUpperCase() + mode.slice(1)} Account`,
        scope: { 
          account_type: mode,
          trading_permissions: accountInfo?.trading_blocked === false ? ['trading'] : [],
          account_status: accountInfo?.status || 'unknown',
          account_number: accountInfo?.account_number
        },
        last_sync: new Date().toISOString()
      }, { onConflict: 'workspace_id,provider' });

    if (upsertError) {
      console.error('❌ Failed to store connection:', upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log(`✅ Connection metadata stored successfully`);
  } catch (e) {
    console.error('💥 Error in storeConnection:', e);
    throw e;
  }
}
