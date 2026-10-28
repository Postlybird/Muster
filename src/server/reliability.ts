import "server-only";

import {
  outcomeOf,
  reliabilityScore,
  type ShiftOutcome,
} from "@/domain/reliability";
import { isLateArrival } from "@/domain/timesheets";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

/**
 * Brings workers' reliability and shifts-worked counts up to date (brief
 * §4.7) from their bookings and timesheets: after a cancellation or
 * no-show, and when hours come in or change. Reads every booking, so it
 * uses the service-role key.
 */
export async function refreshReliability(workerIds: readonly string[]) {
  const ids = [...new Set(workerIds)];
  if (ids.length === 0) return;
  const admin = createAdminClient();
  const [settings, { data, error }] = await Promise.all([
    getAllSettings(),
    admin
      .from("assignments")
      .select(
        "worker_id, status, late_cancellation, shifts(starts_at), timesheets(status, start_at)",
      )
      .in("worker_id", ids),
  ]);
  if (error) throw new Error(`Couldn't load bookings: ${error.message}`);
  const rules = {
    window: settings.reliability_window_shifts,
    lateCancelCredit: settings.reliability_late_cancel_credit,
    lateArrivalCredit: settings.reliability_late_arrival_credit,
  };
  await Promise.all(
    ids.map(async (workerId) => {
      const outcomes = (data ?? [])
        .filter((row) => row.worker_id === workerId && row.shifts)
        .sort((a, b) => b.shifts!.starts_at.localeCompare(a.shifts!.starts_at))
        .map((row) => {
          const hours =
            row.timesheets && row.timesheets.status !== "rejected"
              ? row.timesheets
              : null;
          return outcomeOf({
            status: row.status,
            lateCancellation: row.late_cancellation,
            worked: hours !== null,
            lateArrival:
              hours !== null &&
              isLateArrival(
                new Date(hours.start_at),
                new Date(row.shifts!.starts_at),
                settings.late_arrival_grace_minutes,
              ),
          });
        })
        .filter((outcome): outcome is ShiftOutcome => outcome !== null);
      const { error: saveError } = await admin
        .from("workers")
        .update({
          reliability_score: reliabilityScore(outcomes, rules),
          shifts_completed: outcomes.filter(
            (o) => o === "worked" || o === "late_arrival",
          ).length,
        })
        .eq("id", workerId);
      if (saveError) {
        console.error("Couldn't save reliability", saveError);
      }
    }),
  );
}

/**
 * Closes off shifts whose time has passed (and jobs with nothing left),
 * then brings the reliability of whoever worked them up to date. Run on a
 * schedule, like the reminders.
 */
export async function finishShifts() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("finish_shifts");
  if (error) throw new Error(`Couldn't finish shifts: ${error.message}`);
  const workers = (data ?? []).map((row) => row.worker_id);
  await refreshReliability(workers);
  return { workers: workers.length };
}
