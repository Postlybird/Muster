import { fromZonedTime } from "date-fns-tz";

import {
  costShift,
  emptyMinutes,
  splitShift,
  type CostRules,
  type HoursRules,
  type MinutesByType,
  type ShiftCost,
} from "./pay";

/**
 * Timesheets (brief §4.6): the hours a worker is paid, and the business
 * billed, for one booking. The database records them from clock-ins and
 * outs and keeps who approved, changed or queried them; this works out the
 * hours and their cost with the rates kept on the booking (brief §4.8).
 */

export type TimesheetStatus =
  | "submitted"
  | "approved"
  | "auto_approved"
  | "adjusted"
  | "disputed"
  | "rejected";

/** Hours in these statuses are paid and billed. */
export const PAYABLE_STATUSES: readonly TimesheetStatus[] = [
  "approved",
  "auto_approved",
  "adjusted",
];

export function isPayable(status: TimesheetStatus): boolean {
  return PAYABLE_STATUSES.includes(status);
}

export type TimesheetHours = {
  start: Date;
  finish: Date;
  /** Unpaid. */
  breakMinutes: number;
};

const MINUTE = 60_000;

function wholeMinutes(date: Date): number {
  return Math.round(date.getTime() / MINUTE);
}

/** Minutes worked: start to finish, to the minute, less the break. */
export function workedMinutes(hours: TimesheetHours): number {
  const length = wholeMinutes(hours.finish) - wholeMinutes(hours.start);
  return Math.max(0, length - hours.breakMinutes);
}

/** Minutes worked by rate type; none when nothing was worked. */
export function timesheetMinutes(
  hours: TimesheetHours,
  rules: HoursRules,
): MinutesByType {
  if (workedMinutes(hours) === 0) return emptyMinutes();
  return splitShift(
    { start: hours.start, end: hours.finish, breakMinutes: hours.breakMinutes },
    rules,
  );
}

/**
 * Pay and bill for a timesheet with the booking's rates. Short hours are
 * topped up to the minimum engagement (brief §4.5: someone who came is
 * paid at least that).
 */
export function costTimesheet(
  hours: TimesheetHours,
  hoursRules: HoursRules,
  costRules: CostRules,
): { minutes: MinutesByType; cost: ShiftCost } {
  const minutes = timesheetMinutes(hours, hoursRules);
  return { minutes, cost: costShift(minutes, costRules) };
}

/**
 * Started after the grace period (a setting), which counts against
 * reliability (brief §4.7: punctuality).
 */
export function isLateArrival(
  start: Date,
  shiftStart: Date,
  graceMinutes: number,
): boolean {
  return start.getTime() - shiftStart.getTime() > graceMinutes * MINUTE;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Hours typed on a form: the start on the shift's day (yyyy-mm-dd, local
 * time), and a finish no later than the start meaning the next day.
 */
export function enteredHours(
  input: { date: string; start: string; finish: string; breakMinutes: number },
  timeZone: string,
): TimesheetHours | { problem: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { problem: "Choose the day." };
  }
  if (!TIME.test(input.start) || !TIME.test(input.finish)) {
    return { problem: "Enter the start and finish times." };
  }
  const start = fromZonedTime(`${input.date}T${input.start}:00`, timeZone);
  const finishDate =
    input.finish <= input.start ? addDays(input.date, 1) : input.date;
  const finish = fromZonedTime(`${finishDate}T${input.finish}:00`, timeZone);
  const length = (finish.getTime() - start.getTime()) / MINUTE;
  if (!Number.isInteger(input.breakMinutes) || input.breakMinutes < 0) {
    return { problem: "Enter the break in whole minutes." };
  }
  if (input.breakMinutes >= length) {
    return { problem: "The break must be shorter than the time worked." };
  }
  return { start, finish, breakMinutes: input.breakMinutes };
}
