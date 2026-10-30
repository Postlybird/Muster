import { STATE_TIME_ZONES } from "@/domain/pay";
import { enteredHours, type TimesheetHours } from "@/domain/timesheets";

import { dateKeyIn } from "./format";
import { failure, type ActionState } from "./forms";
import type { Database } from "./supabase/database.types";

type Functions = Database["public"]["Functions"];

/** Columns the database leaves empty, whatever the generated types say. */
type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

/**
 * A booking's hours as the business sees them (business_timesheets()):
 * the timesheet's columns are empty until there is one.
 */
export type BusinessHours = Nullable<
  Functions["business_timesheets"]["Returns"][number],
  | "timesheet_id"
  | "status"
  | "started_at"
  | "clocked_out_at"
  | "recorded_start"
  | "recorded_finish"
  | "start_at"
  | "finish_at"
  | "break_minutes"
  | "approve_by"
  | "adjusted_at"
  | "business_note"
  | "worker_note"
  | "resolution"
  | "bill_cents"
>;

/** A worker's timesheet (my_timesheets()). */
export type WorkerTimesheet = Nullable<
  Functions["my_timesheets"]["Returns"][number],
  | "recorded_start"
  | "recorded_finish"
  | "adjusted_at"
  | "business_note"
  | "worker_note"
  | "resolution"
  | "resolved_at"
  | "pay_cents"
>;

/** The business's hours, sorted into what needs doing (brief §7). */
export function groupBusinessHours(rows: readonly BusinessHours[], now: Date) {
  return {
    /** Waiting for the business. */
    toApprove: rows.filter((row) => row.status === "submitted"),
    /** Shift over and no timesheet: no clock-in, or no clock-out yet. */
    missing: rows.filter(
      (row) =>
        row.timesheet_id === null &&
        Date.parse(row.shift_ends_at) <= now.getTime(),
    ),
    /** With our team. */
    queried: rows.filter((row) => row.status === "disputed"),
    /** Approved one way or another, or not charged. */
    done: rows.filter(
      (row) =>
        row.status !== null &&
        row.status !== "submitted" &&
        row.status !== "disputed",
    ),
  };
}

/**
 * Where the hours form reads times: the day the shift starts at its site
 * (yyyy-mm-dd), and the site's time zone.
 */
export type ShiftDay = { date: string; timeZone: string };

export function shiftDay(startsAt: string | Date, timeZone: string): ShiftDay {
  return { date: dateKeyIn(startsAt, timeZone), timeZone };
}

/** "07:30" at the site, for a time input. */
export function timeInputValue(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

/**
 * Reads the hours form: start and finish times on the shift's day at its
 * site (a finish before the start is the next morning), the break and a
 * note.
 */
export function hoursFromForm(
  formData: FormData,
  day: ShiftDay,
  { noteRequired }: { noteRequired: boolean },
):
  | { ok: true; hours: TimesheetHours; note: string }
  | { ok: false; state: ActionState } {
  const start = String(formData.get("start") ?? "");
  const finish = String(formData.get("finish") ?? "");
  const breakText = String(formData.get("break") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const errors: Record<string, string[]> = {};
  if (!start) errors.start = ["Enter the start time"];
  if (!finish) errors.finish = ["Enter the finish time"];
  const breakMinutes = breakText === "" ? 0 : Number(breakText);
  if (
    !Number.isInteger(breakMinutes) ||
    breakMinutes < 0 ||
    breakMinutes > 240
  ) {
    errors.break = ["Enter the break in minutes, up to 240"];
  }
  if (noteRequired && !note) errors.note = ["Say what changed, for the worker"];
  if (note.length > 1000) errors.note = ["Keep it under 1,000 characters"];
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      state: failure("Check the highlighted fields.", errors),
    };
  }
  if (!(Object.values(STATE_TIME_ZONES) as string[]).includes(day.timeZone)) {
    return {
      ok: false,
      state: failure("Something went wrong. Reload the page and try again."),
    };
  }
  const hours = enteredHours(
    { date: day.date, start, finish, breakMinutes },
    day.timeZone,
  );
  if ("problem" in hours) {
    const field = hours.problem.includes("break") ? "break" : "start";
    return {
      ok: false,
      state: failure(hours.problem, { [field]: [hours.problem] }),
    };
  }
  return { ok: true, hours, note };
}
