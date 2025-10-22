import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace } from "../_shared/guards.ts";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  
  try {
    const workspace_id = await ensureWorkspace(supabase);
    const body = await req.json();
    
    const { provider, mode, apiKey, secretKey } = body;
    
    if (!provider || !mode || !apiKey || !secretKey) {
      return json({ ok: false, error: "missing_parameters" }, 400);
    }

    console.log(`🔐 Updating credentials for ${provider}:${mode}`);

    // Call the encryption function
    const encryptResult = await fetch(
      new URL(req.url).origin + "/functions/v1/encrypt-brokerage-credentials",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || ""
        },
        body: JSON.stringify({
          broker: provider,
          mode,
          apiKey,
          secretKey,
          workspaceId: workspace_id
        })
      }
    );

    const encryptData = await encryptResult.json();
    
    if (!encryptData.ok) {
      console.error('❌ Encryption failed:', encryptData.error);
      return json({ ok: false, error: encryptData.error }, 500);
    }

    console.log(`✅ Credentials updated successfully`);

    return json({
      ok: true,
      message: "Credentials updated successfully",
      workspace_id
    });

  } catch (error) {
    console.error('💥 Update error:', error);
    return json({ 
      ok: false, 
      error: (error as Error).message || 'Failed to update credentials'
    }, 500);
  }
});
