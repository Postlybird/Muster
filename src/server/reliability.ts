import "server-only";

import {
  outcomeOf,
  reliabilityScore,
  type ShiftOutcome,
} from "@/domain/reliability";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

/**
 * Brings workers' reliability and shifts-worked counts up to date (brief
 * §4.7) from their bookings: after a cancellation or no-show, and when
 * shifts finish. Reads every booking, so it uses the service-role key.
 */
export async function refreshReliability(
  workerIds: readonly string[],
  now = new Date(),
) {
  const ids = [...new Set(workerIds)];
  if (ids.length === 0) return;
  const admin = createAdminClient();
  const [settings, { data, error }] = await Promise.all([
    getAllSettings(),
    admin
      .from("assignments")
      .select(
        "worker_id, status, late_cancellation, shifts(starts_at, ends_at)",
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
        .map((row) =>
          outcomeOf(
            {
              status: row.status,
              lateCancellation: row.late_cancellation,
              endsAt: new Date(row.shifts!.ends_at),
            },
            now,
          ),
        )
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
