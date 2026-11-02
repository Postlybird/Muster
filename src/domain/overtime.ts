/**
 * Overtime across a worker's shifts (owner, 02/11/2026). We employ every
 * worker for every shift, so their hours with us add up: past the daily
 * limit (the rate card's, or the setting) or the weekly one (the setting,
 * 38 hours, Monday to Sunday), hours are overtime. They're added up in the
 * order the shifts were booked, so the business whose booking takes a
 * worker past a limit is the one charged, and the one we can warn first.
 *
 * Pure functions: the caller loads the worker's bookings. Days are the
 * site's local yyyy-mm-dd.
 */

/** One of a worker's bookings, as far as their hours go. */
export type BookedHours = {
  /** The shift it's for. */
  shiftId: string;
  /** When it was booked: earlier bookings count first. */
  bookedAt: string;
  /** The local date the shift starts on. */
  day: string;
  /** Worked minutes: the approved hours once there are some, else the roster. */
  minutes: number;
};

/** A worker's hours with us before a shift, for splitShift(). */
export type PriorHours = {
  /** Minutes already worked or booked that day. */
  dayMinutes: number;
  /** Ordinary minutes (up to each day's limit) already worked or booked that week, that day included. */
  weekOrdinaryMinutes: number;
};

export const NO_PRIOR_HOURS: PriorHours = {
  dayMinutes: 0,
  weekOrdinaryMinutes: 0,
};

export type OvertimeLimits = {
  /** Ordinary minutes in a day, from the shift's rate card or the setting. */
  dailyMinutes: number;
  /** Ordinary minutes in a week, from the setting. */
  weeklyMinutes: number;
};

/** The Monday (yyyy-mm-dd) of a date's week. */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const fromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - fromMonday);
  return date.toISOString().slice(0, 10);
}

/** Minutes of a shift or timesheet less its unpaid break. */
export function workedMinutes(start: Date, end: Date, breakMinutes: number) {
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000) - breakMinutes,
  );
}

function bookedBefore(
  booking: BookedHours,
  target: { bookedAt: string | null; shiftId: string },
): boolean {
  if (target.bookedAt === null) return true;
  return (
    booking.bookedAt < target.bookedAt ||
    (booking.bookedAt === target.bookedAt && booking.shiftId < target.shiftId)
  );
}

/**
 * A worker's hours with us before a shift: those of their other bookings in
 * the same week that were booked before it (all of them for a shift they're
 * not booked on yet, `bookedAt` null). Each day counts up to the daily limit
 * towards the week, as hours past it are already overtime.
 */
export function priorHours(
  target: { shiftId: string; bookedAt: string | null; day: string },
  bookings: readonly BookedHours[],
  dailyLimitMinutes: number,
): PriorHours {
  const week = weekStart(target.day);
  const byDay = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.shiftId === target.shiftId) continue;
    if (weekStart(booking.day) !== week || !bookedBefore(booking, target)) {
      continue;
    }
    byDay.set(booking.day, (byDay.get(booking.day) ?? 0) + booking.minutes);
  }
  let weekOrdinaryMinutes = 0;
  for (const minutes of byDay.values()) {
    weekOrdinaryMinutes += Math.min(minutes, dailyLimitMinutes);
  }
  return { dayMinutes: byDay.get(target.day) ?? 0, weekOrdinaryMinutes };
}

/**
 * Whether a worker's other hours put some of a shift into overtime that it
 * wouldn't have on its own: the check for shifts workers take themselves,
 * which the business hasn't opened to workers on overtime. The database's
 * book_worker() makes the same check.
 */
export function overtimeFromOtherShifts(
  prior: PriorHours,
  minutes: number,
  limits: OvertimeLimits,
): boolean {
  const daily =
    prior.dayMinutes > 0 && prior.dayMinutes + minutes > limits.dailyMinutes;
  const weekAfter =
    prior.weekOrdinaryMinutes -
    Math.min(prior.dayMinutes, limits.dailyMinutes) +
    Math.min(prior.dayMinutes + minutes, limits.dailyMinutes);
  return daily || weekAfter > limits.weeklyMinutes;
}

/**
 * How many minutes of a shift are past the daily or weekly limit only
 * because of the worker's other hours (for telling people, whatever rate
 * those minutes are paid at), and which limit did it.
 */
export function overtimeFromOtherShiftsMinutes(
  prior: PriorHours,
  minutes: number,
  limits: OvertimeLimits,
): { minutes: number; reason: "day" | "week" } {
  const alone = Math.max(0, minutes - limits.dailyMinutes);
  const day =
    prior.dayMinutes > 0
      ? Math.min(
          minutes,
          Math.max(0, prior.dayMinutes + minutes - limits.dailyMinutes),
        ) - alone
      : 0;
  const weekAfter =
    prior.weekOrdinaryMinutes -
    Math.min(prior.dayMinutes, limits.dailyMinutes) +
    Math.min(prior.dayMinutes + minutes, limits.dailyMinutes);
  const week = Math.min(
    minutes - alone,
    Math.max(0, weekAfter - limits.weeklyMinutes),
  );
  return day >= week
    ? { minutes: Math.max(0, day), reason: "day" }
    : { minutes: week, reason: "week" };
}
