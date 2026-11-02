import "server-only";

import {
  NO_PRIOR_HOURS,
  overtimeFromOtherShiftsMinutes,
  priorHours,
  workedMinutes,
  type BookedHours,
  type PriorHours,
} from "@/domain/overtime";
import {
  costShift,
  splitShift,
  STATE_TIME_ZONES,
  type CostRules,
  type HoursRules,
  type StateCode,
} from "@/domain/pay";
import { createAdminClient } from "@/lib/supabase/admin";

import { getAllSettings } from "./settings";

/**
 * Overtime from a worker's other shifts with us (owner, 02/11/2026): how
 * much of a shift would be, or is, overtime because of the hours of shifts
 * booked before it that day or week, and what it adds. Shown to the
 * business before it picks someone and on its booked workers, and to the
 * worker on their shift. It reads every worker's bookings and the rates, so
 * it uses the service-role key; callers only get these figures, after
 * checking the person may see the shift.
 */

export type OvertimeNote = {
  /** Minutes of the shift that are overtime only because of other shifts. */
  minutes: number;
  /** The worker's hours with us before it: that day, or (when that's what did it) that week. */
  reason: "day" | "week";
  priorMinutes: number;
  /** Extra pay for the worker, and extra charge (excluding GST) for the business. */
  extraPayCents: number;
  extraBillCents: number;
};

type Target = {
  key: string;
  workerId: string;
  shiftId: string;
  /** Null for someone not booked yet: all their bookings count. */
  bookedAt: string | null;
  rules: CostRules | null;
};

async function notesFor(targets: Target[]): Promise<Map<string, OvertimeNote>> {
  const notes = new Map<string, OvertimeNote>();
  const priced = targets.filter((target) => target.rules);
  if (priced.length === 0) return notes;
  const admin = createAdminClient();
  const settings = await getAllSettings();

  const { data: shifts, error } = await admin
    .from("shifts")
    .select("id, starts_at, ends_at, break_minutes, jobs(sites(state))")
    .in("id", [...new Set(priced.map((target) => target.shiftId))]);
  if (error) throw new Error(`Couldn't load shifts: ${error.message}`);
  const shiftOf = new Map((shifts ?? []).map((shift) => [shift.id, shift]));
  const starts = (shifts ?? []).map((shift) => Date.parse(shift.starts_at));
  if (starts.length === 0) return notes;

  const states = [
    ...new Set((shifts ?? []).flatMap((s) => s.jobs?.sites?.state ?? [])),
  ];
  const [{ data: booked, error: bookedError }, { data: holidays }] =
    await Promise.all([
      admin.rpc("worker_booked_minutes", {
        p_worker_ids: [...new Set(priced.map((target) => target.workerId))],
        p_from: new Date(Math.min(...starts) - 9 * 86_400_000).toISOString(),
        p_to: new Date(Math.max(...starts) + 9 * 86_400_000).toISOString(),
      }),
      admin.from("public_holidays").select("state, date").in("state", states),
    ]);
  if (bookedError) {
    throw new Error(`Couldn't load booked hours: ${bookedError.message}`);
  }
  const hoursOf = new Map<string, BookedHours[]>();
  const dayOf = new Map<string, string>();
  for (const row of booked ?? []) {
    hoursOf.set(row.worker_id, [
      ...(hoursOf.get(row.worker_id) ?? []),
      {
        shiftId: row.shift_id,
        bookedAt: row.booked_at,
        day: row.day,
        minutes: row.minutes,
      },
    ]);
    dayOf.set(row.shift_id, row.day);
  }

  const dailyDefault = Math.round(settings.daily_overtime_after_hours * 60);
  const weekly = Math.round(settings.weekly_overtime_after_hours * 60);
  for (const target of priced) {
    const shift = shiftOf.get(target.shiftId);
    const state = shift?.jobs?.sites?.state as StateCode | undefined;
    if (!shift || !state || !(state in STATE_TIME_ZONES)) continue;
    const timeZone = STATE_TIME_ZONES[state];
    const rules = target.rules!;
    const daily = rules.card.award?.overtimeAfterMinutes ?? dailyDefault;
    const day =
      dayOf.get(target.shiftId) ??
      new Intl.DateTimeFormat("en-CA", { timeZone }).format(
        new Date(shift.starts_at),
      );
    const prior = priorHours(
      { shiftId: target.shiftId, bookedAt: target.bookedAt, day },
      hoursOf.get(target.workerId) ?? [],
      daily,
    );
    if (prior.dayMinutes === 0 && prior.weekOrdinaryMinutes === 0) continue;
    const hoursRules: HoursRules = {
      timeZone,
      publicHolidays: new Set(
        (holidays ?? []).filter((h) => h.state === state).map((h) => h.date),
      ),
      overtimeAfterMinutes: dailyDefault,
      weeklyOvertimeAfterMinutes: weekly,
      night: settings.night_hours,
    };
    const times = {
      start: new Date(shift.starts_at),
      end: new Date(shift.ends_at),
      breakMinutes: shift.break_minutes,
    };
    // The hours past a limit, whatever they're paid at (on a Saturday or
    // Sunday the day's own rate can be as high), and what they add.
    const past = overtimeFromOtherShiftsMinutes(
      prior,
      workedMinutes(times.start, times.end, times.breakMinutes),
      { dailyMinutes: daily, weeklyMinutes: weekly },
    );
    if (past.minutes <= 0) continue;
    const split = (p: PriorHours) =>
      splitShift(times, hoursRules, rules.card, p);
    const costAlone = costShift(split(NO_PRIOR_HOURS), rules);
    const costWithOthers = costShift(split(prior), rules);
    const extraBillCents = costWithOthers.billCents - costAlone.billCents;
    const extraPayCents = costWithOthers.payCents - costAlone.payCents;
    if (extraBillCents <= 0 && extraPayCents <= 0) continue;
    notes.set(target.key, {
      minutes: past.minutes,
      reason: past.reason,
      priorMinutes:
        past.reason === "day" ? prior.dayMinutes : prior.weekOrdinaryMinutes,
      extraPayCents,
      extraBillCents,
    });
  }
  return notes;
}

/**
 * For the business before it books: each applicant on each shift they
 * applied for, keyed "worker:shift". The shifts' prices are the ones a
 * booking would keep (shift_pay).
 */
export async function overtimeIfBooked(
  pairs: readonly { workerId: string; shiftId: string }[],
): Promise<Map<string, OvertimeNote>> {
  if (pairs.length === 0) return new Map();
  const { data, error } = await createAdminClient()
    .from("shift_pay")
    .select("shift_id, cost_rules")
    .in("shift_id", [...new Set(pairs.map((pair) => pair.shiftId))]);
  if (error) throw new Error(`Couldn't load shift prices: ${error.message}`);
  const rulesOf = new Map(
    (data ?? []).map((row) => [row.shift_id, row.cost_rules as CostRules]),
  );
  return notesFor(
    pairs.map((pair) => ({
      key: `${pair.workerId}:${pair.shiftId}`,
      workerId: pair.workerId,
      shiftId: pair.shiftId,
      bookedAt: null,
      rules: rulesOf.get(pair.shiftId) ?? null,
    })),
  );
}

/** For bookings already made, keyed by booking (assignment) id. */
export async function overtimeOfBookings(
  assignmentIds: readonly string[],
): Promise<Map<string, OvertimeNote>> {
  if (assignmentIds.length === 0) return new Map();
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select("id, worker_id, shift_id, created_at, assignment_rates(cost_rules)")
    .in("id", [...new Set(assignmentIds)]);
  if (error) throw new Error(`Couldn't load bookings: ${error.message}`);
  return notesFor(
    (data ?? []).map((row) => ({
      key: row.id,
      workerId: row.worker_id,
      shiftId: row.shift_id,
      bookedAt: row.created_at,
      rules:
        (row.assignment_rates?.cost_rules as CostRules | undefined) ?? null,
    })),
  );
}
