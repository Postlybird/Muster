import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { costTimesheetsWith } from "@/lib/timesheet-costing";

import { refreshReliability } from "./reliability";
import { getAllSettings } from "./settings";
import { emailAutoApproved, emailTimesheetsReady } from "./timesheet-notices";

/**
 * Works out pay and bill for approved hours (brief §4.8) with the rates
 * kept on each booking. Rates and costs are admin-only, so this uses the
 * service-role key; workers and businesses see only their side, through
 * my_timesheets() and business_timesheets(). With no ids, costs whatever
 * is waiting.
 */
export async function costTimesheets(ids?: readonly string[]) {
  return costTimesheetsWith(createAdminClient(), await getAllSettings(), ids);
}

/**
 * The timesheets job, run on a schedule like the reminders: timesheets
 * for anyone who didn't clock out, the "ready to approve" emails, hours
 * nobody approved in time (brief §4.6), then costing.
 */
export async function runTimesheets() {
  const admin = createAdminClient();
  const { data: recorded, error } = await admin.rpc(
    "record_missing_timesheets",
  );
  if (error) throw new Error(`Couldn't record timesheets: ${error.message}`);
  const { data: approved, error: approveError } = await admin.rpc(
    "auto_approve_timesheets",
  );
  if (approveError) {
    throw new Error(`Couldn't approve timesheets: ${approveError.message}`);
  }
  const ready = await emailTimesheetsReady();
  await emailAutoApproved((approved ?? []).map((row) => row.timesheet_id));
  const { costed } = await costTimesheets();
  await refreshReliability((recorded ?? []).map((row) => row.worker_id));
  return {
    recorded: (recorded ?? []).length,
    ready,
    autoApproved: (approved ?? []).length,
    costed,
  };
}
