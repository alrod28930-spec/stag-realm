import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { preflight, json, supaFromReq } from "../_shared/http.ts";
import { ensureWorkspace } from "../_shared/guards.ts";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  
  const supabase = supaFromReq(req);
  
  try {
    const workspace_id = await ensureWorkspace(supabase, req);
    const body = await req.json();
    
    const { provider, mode, apiKey, secretKey } = body;
    
    if (!provider || !mode || !apiKey || !secretKey) {
      return json({ ok: false, error: "missing_parameters" }, 400);
    }

    console.log(`🔐 Updating credentials for ${provider}:${mode}`);

    // Ensure connection row exists
    const { data: existing } = await supabase
      .from('connections_brokerages')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('provider', provider)
      .eq('mode', mode)
      .single();

    if (!existing) {
      // Create the connection record first
      const { error: insertError } = await supabase
        .from('connections_brokerages')
        .insert({
          workspace_id,
          provider,
          mode,
          is_active: true
        });

      if (insertError) {
        console.error('❌ Failed to create connection:', insertError);
        return json({ ok: false, error: "failed_to_create_connection" }, 500);
      }
    }

    // Call the encryption function using Supabase client
    const { data: encryptData, error: encryptError } = await supabase.functions.invoke(
      'encrypt-brokerage-credentials',
      {
        body: {
          broker: provider,
          mode,
          apiKey,
          secretKey,
          workspaceId: workspace_id
        }
      }
    );
    
    if (encryptError || !encryptData?.ok) {
      console.error('❌ Encryption failed:', encryptError || encryptData?.error);
      return json({ ok: false, error: encryptData?.error || 'encryption_failed' }, 500);
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
