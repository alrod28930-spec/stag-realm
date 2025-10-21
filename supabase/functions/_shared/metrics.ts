/**
 * Metrics and event recording utilities
 */

export async function recordEvent(
  supabase: any, 
  workspace_id: string, 
  source: string, 
  payload: any
): Promise<void> {
  await supabase.from("repository_events").insert({ 
    workspace_id, 
    source, 
    payload 
  });
}
