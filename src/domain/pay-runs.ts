import { fromZonedTime } from "date-fns-tz";

import {
  costShift,
  emptyMinutes,
  mainType,
  percentOf,
  splitShift,
  type CostRules,
  type HoursRules,
  type ShiftCost,
  type ShiftTimes,
} from "./pay";
import type { DayType } from "./rates";

/**
 * The weekly pay and billing run (brief §4.8). Each week, Monday to Sunday
 * in Sydney, is run once: approved hours not yet paid, from that week or
 * before, become payroll lines and one invoice per business with a line
 * per worker per shift, and late cancellations add their charges. Dates
 * are yyyy-mm-dd calendar dates.
 */

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type Week = { start: string; end: string };

const DAY = 86_400_000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

/** 0 for a Monday through 6 for a Sunday. */
function dayOfWeek(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** The Monday-to-Sunday week a date falls in. */
export function weekOf(date: string): Week {
  const start = addDays(date, -dayOfWeek(date));
  return { start, end: addDays(start, 6) };
}

/** The week a run on `today` covers: the last full week before today's. */
export function lastFullWeek(today: string): Week {
  return weekOf(addDays(today, -7));
}

/** Whether `today` is the weekly run day (a setting). */
export function isRunDay(today: string, runDay: Weekday): boolean {
  return WEEKDAYS[dayOfWeek(today)] === runDay;
}

/** Midnight at the end of the week's Sunday, local time. */
export function weekEndsAt(week: Week, timeZone: string): Date {
  return fromZonedTime(`${addDays(week.end, 1)}T00:00:00`, timeZone);
}

export type Cancellation = {
  /** The shift as it was rostered. */
  shift: ShiftTimes;
  /** Recorded when the business cancelled late. */
  chargeHours: number | null;
  payHours: number | null;
  /** The worker had clocked in, or been confirmed on site. */
  arrived: boolean;
};

export type CancellationCost = {
  /** The rate that would have covered most of the shift. */
  type: DayType;
  billMinutes: number;
  payMinutes: number;
  /** The charge, excluding GST. */
  bill: ShiftCost;
  /** The worker's pay, with any urgent allowance. */
  pay: ShiftCost;
};

/**
 * A late business cancellation (plan question 8): the business is charged
 * the hours recorded when it cancelled, and the worker paid them if that
 * setting was on, at the rate that would have covered most of the shift.
 * A worker who had already arrived is paid, and the business charged, at
 * least the minimum engagement.
 */
export function costCancellation(
  cancellation: Cancellation,
  hoursRules: HoursRules,
  costRules: CostRules,
): CancellationCost {
  const type = mainType(splitShift(cancellation.shift, hoursRules));
  const engagement = cancellation.arrived ? costRules.minEngagementMinutes : 0;
  const minutesOf = (hours: number | null) =>
    Math.max(Math.round((hours ?? 0) * 60), engagement);
  const billMinutes = minutesOf(cancellation.chargeHours);
  const payMinutes = minutesOf(cancellation.payHours);
  const at = (minutes: number) =>
    costShift(
      { ...emptyMinutes(), [type]: minutes },
      { ...costRules, minEngagementMinutes: 0 },
    );
  return {
    type,
    billMinutes,
    payMinutes,
    bill: at(billMinutes),
    pay: at(payMinutes),
  };
}

export type InvoiceDraft = {
  business_id: string;
  issued_on: string;
  due_on: string;
  /** Excluding GST. */
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
};

/**
 * One invoice per business for its lines, with GST worked out once on the
 * subtotal and payment due on the business's account terms.
 */
export function invoicesFor(
  lines: readonly { business_id: string; bill_cents: number }[],
  options: {
    issuedOn: string;
    gstPct: number;
    termsDays: (businessId: string) => number;
  },
): InvoiceDraft[] {
  const subtotals = new Map<string, number>();
  for (const line of lines) {
    subtotals.set(
      line.business_id,
      (subtotals.get(line.business_id) ?? 0) + line.bill_cents,
    );
  }
  return [...subtotals].map(([businessId, subtotal]) => {
    const gst = percentOf(subtotal, options.gstPct);
    return {
      business_id: businessId,
      issued_on: options.issuedOn,
      due_on: addDays(options.issuedOn, options.termsDays(businessId)),
      subtotal_cents: subtotal,
      gst_cents: gst,
      total_cents: subtotal + gst,
    };
  });
}

/** Issued, and the due date has passed. */
export function isOverdue(
  invoice: { status: string; due_on: string },
  today: string,
): boolean {
  return invoice.status === "issued" && invoice.due_on < today;
}
