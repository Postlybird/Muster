import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { STATE_TIME_ZONES } from "@/domain/pay";

/**
 * Australian display formats (brief §1). Times are stored in UTC. A shift's
 * times show in its site's time zone (`zoneOf(state)`), so a Perth shift
 * reads in Perth time; everything else shows in Sydney time. Dates are
 * dd/mm/yyyy; money is AUD held as integer cents.
 */

export const TIME_ZONE = "Australia/Sydney";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** The time zone of a site in this state, or Sydney's if it isn't one. */
export function zoneOf(state: string | null | undefined): string {
  return state && Object.hasOwn(STATE_TIME_ZONES, state)
    ? STATE_TIME_ZONES[state as keyof typeof STATE_TIME_ZONES]
    : TIME_ZONE;
}

/**
 * " (Perth time)" for a zone other than Sydney's, for people who see work
 * in several states (our team); nothing for Sydney's.
 */
export function zoneNote(timeZone: string): string {
  if (timeZone === TIME_ZONE) return "";
  const city = timeZone.split("/").at(-1)?.replaceAll("_", " ");
  return city ? ` (${city} time)` : "";
}

/** 28/10/2026 */
export function formatDate(value: DateInput, timeZone = TIME_ZONE): string {
  return formatInTimeZone(toDate(value), timeZone, "dd/MM/yyyy");
}

/** 7:30 am */
export function formatTime(value: DateInput, timeZone = TIME_ZONE): string {
  return formatInTimeZone(toDate(value), timeZone, "h:mm aaa");
}

/** 28/10/2026, 7:30 am */
export function formatDateTime(value: DateInput, timeZone = TIME_ZONE): string {
  return formatInTimeZone(toDate(value), timeZone, "dd/MM/yyyy, h:mm aaa");
}

/** Wed 28 Oct */
export function formatDayShort(value: DateInput, timeZone = TIME_ZONE): string {
  return formatInTimeZone(toDate(value), timeZone, "EEE d MMM");
}

/** The calendar date in a time zone as yyyy-MM-dd (for date inputs and grouping). */
export function dateKeyIn(value: DateInput, timeZone: string): string {
  return formatInTimeZone(toDate(value), timeZone, "yyyy-MM-dd");
}

/** The calendar date in Sydney as yyyy-MM-dd. */
export function sydneyDateKey(value: DateInput): string {
  return dateKeyIn(value, TIME_ZONE);
}

/** A wall-clock date and time ("2026-10-28", "07:30") in a time zone, as a UTC instant. */
export function fromLocalTime(
  date: string,
  time: string,
  timeZone: string,
): Date {
  return fromZonedTime(`${date}T${time}:00`, timeZone);
}

/** A Sydney wall-clock date and time as a UTC instant. */
export function fromSydneyTime(date: string, time: string): Date {
  return fromLocalTime(date, time, TIME_ZONE);
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

/** 123456 → "$1,234.56" */
export function formatCents(cents: number): string {
  return audFormatter.format(cents / 100);
}

/** Minutes as hours: 456 → "7.6 h", 480 → "8 h", 225 → "3.75 h". */
export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 100) / 100;
  return `${hours.toLocaleString("en-AU", { maximumFractionDigits: 2 })} h`;
}

/** A calendar date with no time ("2026-07-01") as 01/07/2026. No time zone involved. */
export function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}
