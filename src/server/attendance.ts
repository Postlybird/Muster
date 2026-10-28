import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { emailPossibleNoShow } from "./booking-notices";

/**
 * Flags booked workers who haven't clocked in a while after the start
 * (plan: 30 minutes, a setting), once each, and tells the business. Run on
 * a schedule.
 */
export async function checkAttendance() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("flag_possible_no_shows");
  if (error) throw new Error(`Couldn't check attendance: ${error.message}`);
  for (const row of data ?? []) {
    await emailPossibleNoShow(row.job_id, row.worker_id);
  }
  return { flagged: (data ?? []).length };
}
