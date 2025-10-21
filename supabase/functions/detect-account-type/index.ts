import { serve } from "https://deno.land/std/http/server.ts";
import { supaFromReq, json, handleCORS, ensureWorkspace } from "../_shared/supa.ts";

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;
  
  try {
    const supabase = supaFromReq(req);
    const workspace_id = await ensureWorkspace(supabase);

    const { broker = "alpaca", apiKey, secretKey } = await req.json().catch(() => ({}));
    
    if (!apiKey || !secretKey) {
      return json({ 
        ok: false, 
        error: "missing_credentials",
        message: "API key and secret are required"
      }, 400);
    }

    console.log('🔍 Testing account credentials with provided API key...');
    
    // Try live first
    const live = await probe("live", apiKey, secretKey);
    if (live.ok) {
      await storeConnection(supabase, workspace_id, broker, "live", live.account);
      return json({ 
        ok: true, 
        broker, 
        mode: "live",
        accountType: "live",
        account: live.account,
        message: "Connected to live trading account successfully"
      });
    }
    
    // Try paper
    const paper = await probe("paper", apiKey, secretKey);
    if (paper.ok) {
      await storeConnection(supabase, workspace_id, broker, "paper", paper.account);
      return json({ 
        ok: true, 
        broker, 
        mode: "paper",
        accountType: "paper",
        account: paper.account,
        message: "Connected to paper trading account successfully"
      });
    }
    
    return json({ 
      ok: false, 
      error: "authentication_failed",
      message: "Invalid API credentials for both live and paper accounts. Please check your API key and secret."
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

async function probe(mode: "live" | "paper", apiKey: string, secretKey: string) {
  const base = mode === "live" 
    ? "https://api.alpaca.markets" 
    : "https://paper-api.alpaca.markets";
    
  try {
    console.log(`🔍 Probing ${mode} endpoint...`);
    const r = await fetch(`${base}/v2/account`, {
      headers: { 
        "APCA-API-KEY-ID": apiKey.trim(), 
        "APCA-API-SECRET-KEY": secretKey.trim() 
      }
    });
    
    if (!r.ok) {
      console.log(`❌ ${mode} probe failed with status: ${r.status}`);
      return { ok: false, error: String(r.status) };
    }
    
    const account = await r.json();
    console.log(`✅ ${mode} probe successful, account: ${account.account_number}`);
    return { ok: true, account };
  } catch (e) {
    console.error(`💥 ${mode} probe error:`, e);
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
