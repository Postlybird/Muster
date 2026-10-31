import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { notifyCalloutUnfilled } from "./booking-notices";

/**
 * Call-outs nobody has accepted after the wait (a setting: 20 minutes to
 * start): the business and our team hear once each. Run on a schedule.
 */
export async function checkCallouts() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("flag_unfilled_callouts");
  if (error) throw new Error(`Couldn't check call-outs: ${error.message}`);
  for (const row of data ?? []) {
    await notifyCalloutUnfilled(row.job_id, row.waited_minutes, row.reach);
  }
  return { flagged: (data ?? []).length };
}
