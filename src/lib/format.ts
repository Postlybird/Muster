import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Australian display formats (brief §1). Times are stored in UTC and shown in
 * Sydney time; dates are dd/mm/yyyy; money is AUD held as integer cents.
 */

export const TIME_ZONE = "Australia/Sydney";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 28/10/2026 */
export function formatDate(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "dd/MM/yyyy");
}

/** 7:30 am */
export function formatTime(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "h:mm aaa");
}

/** 28/10/2026, 7:30 am */
export function formatDateTime(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "dd/MM/yyyy, h:mm aaa");
}

/** Wed 28 Oct */
export function formatDayShort(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "EEE d MMM");
}

/** The calendar date in Sydney as yyyy-MM-dd (for date inputs and grouping). */
export function sydneyDateKey(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "yyyy-MM-dd");
}

/** A Sydney wall-clock date and time ("2026-10-28", "07:30") as a UTC instant. */
export function fromSydneyTime(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TIME_ZONE);
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

/** 123456 → "$1,234.56" */
export function formatCents(cents: number): string {
  return audFormatter.format(cents / 100);
}
