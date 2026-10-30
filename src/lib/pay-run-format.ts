import type { CostLine, ShiftCost } from "@/domain/pay";
import type { Week } from "@/domain/pay-runs";
import type { DayType } from "@/domain/rates";

import {
  formatCalendarDate,
  formatCents,
  formatHours,
  formatTime,
} from "./format";

/** 19/10/2026 to 25/10/2026 */
export function weekLabel(week: Week): string {
  return `${formatCalendarDate(week.start)} to ${formatCalendarDate(week.end)}`;
}

/** What an invoice line is for: who, doing what, where. */
export function lineDescription(
  worker: string,
  workType: string,
  site: string,
): string {
  return `${worker} · ${workType} · ${site}`;
}

/** The work type payroll sees, with the level the pay rate is for. */
export function payrollWorkType(category: string, level: number): string {
  return `${category}, level ${level}`;
}

const rateNames: Record<DayType, string> = {
  ordinary: "ordinary",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "public holiday",
  overtime: "overtime",
  night: "night",
};

function rateLine(line: CostLine): string {
  const what =
    line.kind === "minimum"
      ? "to the minimum engagement"
      : rateNames[line.type];
  return `${formatHours(line.minutes)} ${what} at ${formatCents(line.billRateCents)}/h`;
}

/** The charge, by rate, as the business sees it (never the pay). */
function chargeDetail(cost: ShiftCost): string {
  const parts = cost.lines.map(rateLine);
  if (cost.urgentBillCents > 0) {
    parts.push(`urgent call-out loading ${formatCents(cost.urgentBillCents)}`);
  }
  return parts.join(", ");
}

/**
 * "7:00 am to 3:30 pm, 30 min break. 7.6 h ordinary at $54.00/h, …", in
 * the site's time zone.
 */
export function hoursDetail(
  hours: { start: Date | string; finish: Date | string; breakMinutes: number },
  cost: ShiftCost,
  timeZone: string,
): string {
  const times = `${formatTime(hours.start, timeZone)} to ${formatTime(hours.finish, timeZone)}`;
  const breakText =
    hours.breakMinutes > 0 ? `, ${hours.breakMinutes} min break` : "";
  return `${times}${breakText}. ${chargeDetail(cost)}.`;
}

/** Why a cancelled booking is charged, and at what rate. */
export function cancellationDetail(
  shiftStart: Date | string,
  bill: ShiftCost,
  arrived: boolean,
  timeZone: string,
): string {
  const why = arrived
    ? "Cancelled after they arrived"
    : "Cancelled at short notice";
  return `${why} (shift from ${formatTime(shiftStart, timeZone)}). ${chargeDetail(bill)}.`;
}
