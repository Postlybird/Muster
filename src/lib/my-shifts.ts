import type { Database } from "./supabase/database.types";

type Row = Database["public"]["Functions"]["my_shifts"]["Returns"][number];

/**
 * One of the worker's shifts (from my_shifts()). The booking and pay can
 * be missing, whatever the generated types say.
 */
export type MyShift = Omit<
  Row,
  "assignment_id" | "assignment_status" | "hourly_cents" | "estimate_cents"
> & {
  assignment_id: string | null;
  assignment_status: Row["assignment_status"] | null;
  hourly_cents: number | null;
  estimate_cents: number | null;
};

export type MyJob = { jobId: string; first: MyShift; shifts: MyShift[] };

export type MyShiftGroups = {
  /** Booked, soonest first. */
  booked: MyJob[];
  /** Applied for, waiting on the business. */
  applied: MyJob[];
  /** Applied for, then filled by others. */
  filled: MyJob[];
  /** Booked, then cancelled by the business. */
  cancelled: MyJob[];
};

function byJob(rows: readonly MyShift[]): MyJob[] {
  const jobs = new Map<string, MyShift[]>();
  for (const row of [...rows].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  )) {
    jobs.set(row.job_id, [...(jobs.get(row.job_id) ?? []), row]);
  }
  return [...jobs].map(([jobId, shifts]) => ({
    jobId,
    first: shifts[0]!,
    shifts,
  }));
}

/** The worker's shifts still to finish, sorted into what they're waiting on. */
export function groupMyShifts(
  rows: readonly MyShift[],
  now = new Date(),
): MyShiftGroups {
  const coming = rows.filter((row) => new Date(row.ends_at) > now);
  return {
    booked: byJob(
      coming.filter((row) => row.assignment_status === "confirmed"),
    ),
    applied: byJob(
      coming.filter((row) => row.application_status === "applied"),
    ),
    filled: byJob(
      coming.filter((row) => row.application_status === "declined"),
    ),
    cancelled: byJob(
      coming.filter((row) => row.assignment_status === "cancelled_by_business"),
    ),
  };
}

/**
 * Booked shifts still to start, which the worker can cancel (brief §4.5),
 * and whether each is inside the late cancellation window.
 */
export function cancellable(
  rows: readonly MyShift[],
  lateHours: number,
  now: Date,
): { shift: MyShift; assignmentId: string; late: boolean }[] {
  return rows.flatMap((shift) => {
    const startsIn = Date.parse(shift.starts_at) - now.getTime();
    if (shift.assignment_status !== "confirmed" || !shift.assignment_id) {
      return [];
    }
    if (startsIn <= 0) return [];
    return [
      {
        shift,
        assignmentId: shift.assignment_id,
        late: startsIn < lateHours * 3_600_000,
      },
    ];
  });
}

const HOUR = 3_600_000;

/**
 * The booked shift on now, for clocking in and out: from two hours before
 * the start until twelve hours after the finish (the database allows the
 * same window).
 */
export function liveShift(
  rows: readonly MyShift[],
  now: Date,
): MyShift | undefined {
  const at = now.getTime();
  return rows.find(
    (row) =>
      row.assignment_status === "confirmed" &&
      at >= Date.parse(row.starts_at) - 2 * HOUR &&
      at <= Date.parse(row.ends_at) + 12 * HOUR,
  );
}

export type Attendance = {
  /** A clock-in, or else an arrival the business confirmed. */
  startedAt: string | null;
  confirmedByBusiness: boolean;
  clockedOutAt: string | null;
  next: "clock_in" | "clock_out" | null;
};

/** Where a worker is up to on a shift, from its attendance events. */
export function attendanceOf(
  events: readonly { kind: string; occurred_at: string }[],
): Attendance {
  const first = (kind: string) =>
    events
      .filter((e) => e.kind === kind)
      .map((e) => e.occurred_at)
      .sort()[0] ?? null;
  const clockIn = first("clock_in");
  const arrival = first("arrival_confirmed");
  const clockOut = first("clock_out");
  const startedAt = clockIn ?? arrival;
  return {
    startedAt,
    confirmedByBusiness: !clockIn && !!arrival,
    clockedOutAt: clockOut,
    next: clockOut ? null : startedAt ? "clock_out" : "clock_in",
  };
}
