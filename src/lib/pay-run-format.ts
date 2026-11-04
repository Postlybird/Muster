import type { ShiftCost } from "@/domain/pay";
import type { Week } from "@/domain/pay-runs";
import type { DayType } from "@/domain/rates";

import { formatCalendarDate, formatTime } from "./format";

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
  ordinary: "Ordinary",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "Public holiday",
  overtime: "Overtime",
  night: "Night",
  saturday_after: "Saturday, later hours",
  overtime_after: "Overtime, later hours",
  early_late: "Early or late shift",
  night_shift: "Night shift",
};

/** The same, mid-sentence. */
const rateNamesInText: Record<DayType, string> = {
  ordinary: "ordinary",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "public holiday",
  overtime: "overtime",
  night: "night",
  saturday_after: "Saturday, later hours",
  overtime_after: "overtime, later hours",
  early_late: "early or late shift",
  night_shift: "night shift",
};

/**
 * A row of an invoice line (owner, 04/11/2026): a rate's hours, hourly
 * rate and amount, or an allowance or call-out loading (no hours or rate).
 * Saved with the line as save_pay_run() takes it.
 */
export type InvoicePart = {
  label: string;
  minutes: number | null;
  rate_cents: number | null;
  /** Excluding GST. */
  amount_cents: number;
};

/**
 * The charge as invoice rows: each rate's hours, rate and amount, then any
 * call-out loading and allowances. They add up to the shift's charge
 * (excluding GST), and never show the pay.
 */
export function invoiceParts(cost: ShiftCost): InvoicePart[] {
  const parts: InvoicePart[] = cost.lines.map((line) => ({
    label:
      line.kind === "minimum"
        ? `Minimum engagement (${rateNamesInText[line.type]})`
        : rateNames[line.type],
    minutes: line.minutes,
    rate_cents: line.billRateCents,
    amount_cents: line.billCents,
  }));
  if (cost.urgentBillCents > 0) {
    parts.push({
      label: "Call-out loading",
      minutes: null,
      rate_cents: null,
      amount_cents: cost.urgentBillCents,
    });
  }
  for (const allowance of cost.allowances ?? []) {
    parts.push({
      label: allowance.name,
      minutes: null,
      rate_cents: null,
      amount_cents: allowance.billCents,
    });
  }
  return parts;
}

/** "7:00 am to 3:30 pm, 30 min break", in the site's time zone. */
export function hoursWhen(
  hours: { start: Date | string; finish: Date | string; breakMinutes: number },
  timeZone: string,
): string {
  const times = `${formatTime(hours.start, timeZone)} to ${formatTime(hours.finish, timeZone)}`;
  return hours.breakMinutes > 0
    ? `${times}, ${hours.breakMinutes} min break`
    : times;
}

/** Why a cancelled booking is charged: "Cancelled at short notice (shift from 7:00 am)". */
export function cancellationWhy(
  shiftStart: Date | string,
  arrived: boolean,
  timeZone: string,
): string {
  const why = arrived
    ? "Cancelled after they arrived"
    : "Cancelled at short notice";
  return `${why} (shift from ${formatTime(shiftStart, timeZone)})`;
}

/** Invoice rows as saved with a line; null for lines saved before them. */
export function invoicePartsFrom(value: unknown): InvoicePart[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const part = item as Record<string, unknown>;
    if (
      typeof part.label !== "string" ||
      typeof part.amount_cents !== "number"
    ) {
      return [];
    }
    return [
      {
        label: part.label,
        minutes: typeof part.minutes === "number" ? part.minutes : null,
        rate_cents:
          typeof part.rate_cents === "number" ? part.rate_cents : null,
        amount_cents: part.amount_cents,
      },
    ];
  });
}

/** "PO 4471", or the number as typed when it already says PO ("PO-4471"). */
export function poText(poNumber: string): string {
  return /^p\.?\s?o\.?(?![a-z])/i.test(poNumber) ? poNumber : `PO ${poNumber}`;
}
