/**
 * Entitlements with phase-safe enforcement
 * Dev: bypass enabled (SUBSCRIPTION_ENFORCEMENT=false)
 * Prod: resolves from database (SUBSCRIPTION_ENFORCEMENT=true)
 */

export const SUBSCRIPTION_ENFORCEMENT =
  (Deno.env.get("SUBSCRIPTION_ENFORCEMENT") ?? "true").toLowerCase() === "true";

type Tier = "lite" | "standard" | "pro" | "elite";

const TIER_ORDER: Tier[] = ["lite", "standard", "pro", "elite"];

function maxTier(a: Tier, b: Tier): Tier {
  return TIER_ORDER.indexOf(a) > TIER_ORDER.indexOf(b) ? a : b;
}

export async function resolveUserTier(
  supabase: any,
  workspace_id: string
): Promise<{ ok: boolean; tier: Tier; status: string }> {
  if (!SUBSCRIPTION_ENFORCEMENT) return { ok: true, tier: "elite", status: "bypass" };

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("workspace_id", workspace_id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return { ok: false, tier: "lite", status: "missing" };
  const plan = (data.plan as Tier) ?? "lite";
  const status = (data.status as string) ?? "inactive";
  const active = ["active", "trialing", "past_due"].includes(status);
  return { ok: active, tier: active ? plan : "lite", status };
}

export async function has_entitlement(
  supabase: any,
  workspace_id: string,
  feature: string
): Promise<boolean> {
  // Check explicit feature flags first
  const { data: ff } = await supabase
    .from("feature_flags")
    .select("flag, enabled")
    .eq("workspace_id", workspace_id)
    .eq("flag", feature)
    .limit(1)
    .maybeSingle();
  if (ff) return !!ff.enabled;

  const { ok, tier } = await resolveUserTier(supabase, workspace_id);
  if (!ok) return false;

  // Feature to minimum tier mapping
  const ACCESS: Record<string, Tier> = {
    "trade.live": "pro",
    "oracle.realtime": "standard",
    "analyst.voice": "pro",
    "export.pdf": "standard",
    "export.csv": "lite",
  };
  const required = (ACCESS[feature] as Tier) ?? "lite";
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);
}

export async function checkFeatureFlag(
  supabase: any,
  workspace_id: string,
  flag: string
): Promise<boolean> {
  if (!SUBSCRIPTION_ENFORCEMENT) return true;
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("workspace_id", workspace_id)
    .eq("flag", flag)
    .limit(1)
    .maybeSingle();
  return !!data?.enabled;
}

export async function checkLicenseStatus(
  supabase: any,
  workspace_id: string
): Promise<{ active: boolean; tier: Tier; status: string }> {
  if (!SUBSCRIPTION_ENFORCEMENT) return { active: true, tier: "elite", status: "bypass" };
  const r = await resolveUserTier(supabase, workspace_id);
  return { active: r.ok, tier: r.tier, status: r.status };
}

/**
 * Legacy compatibility - synchronous version that always returns true in bypass mode
 */
export function has_entitlement_sync(workspace_id?: string, feature?: string): boolean {
  return !SUBSCRIPTION_ENFORCEMENT;
}

/**
 * Legacy compatibility - synchronous tier check
 */
export function checkUserTier(workspace_id?: string): { ok: boolean; tier: string } {
  if (!SUBSCRIPTION_ENFORCEMENT) {
    return { ok: true, tier: 'elite' };
  }
  // In enforcement mode, callers should use async resolveUserTier
  return { ok: false, tier: 'lite' };
}
