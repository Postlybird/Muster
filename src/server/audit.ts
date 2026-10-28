import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { requestClientInfo } from "./request";

/**
 * Records that the signed-in user viewed or did something sensitive (brief
 * §4.9: who viewed, changed or verified any worker document or personal
 * record). Changes to rows are logged by database triggers; this is for
 * views and actions outside the database.
 */
export async function logAccess(
  action: string,
  table: string,
  recordId: string,
  subjectProfileId: string | null,
  context: Record<string, Json> = {},
): Promise<void> {
  const supabase = await createClient();
  const { ip, userAgent } = await requestClientInfo();
  const { error } = await supabase.rpc("log_access_event", {
    p_action: action,
    p_table_name: table,
    p_record_id: recordId,
    p_subject_profile_id: subjectProfileId ?? undefined,
    p_context: context,
    p_ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : undefined,
    p_user_agent: userAgent?.slice(0, 500) ?? undefined,
  });
  if (error) console.error("Couldn't write the access log", error);
}
