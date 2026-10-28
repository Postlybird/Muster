import { addDays } from "./pay-runs";

/**
 * Reports (brief §6): the periods they cover (Sydney dates, both ends
 * included) and the rates and durations they show.
 */

export type Period = { from: string; to: string };

export const PERIODS = [
  "last_7",
  "last_30",
  "this_month",
  "last_month",
] as const;
export type PeriodKind = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
};

export function periodOf(kind: PeriodKind, today: string): Period {
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  switch (kind) {
    case "last_7":
      return { from: addDays(today, -6), to: today };
    case "last_30":
      return { from: addDays(today, -29), to: today };
    case "this_month":
      return { from: firstOfMonth, to: today };
    case "last_month": {
      const lastOfPrevious = addDays(firstOfMonth, -1);
      return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious };
    }
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_PERIOD_DAYS = 366;

/** A period someone chose, if it's real dates in order and at most a year. */
export function customPeriod(from: string, to: string): Period | null {
  if (!DATE.test(from) || !DATE.test(to)) return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  // Rejects dates like 2026-02-31, which Date.parse rolls over.
  if (addDays(from, 0) !== from || addDays(to, 0) !== to) return null;
  if ((end - start) / 86_400_000 >= MAX_PERIOD_DAYS) return null;
  return { from, to };
}

/** A whole-number percentage, or null when there's nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** How long something took: "45 min", "3 h 20 min", "2 days 4 h". */
export function durationLabel(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  if (total < 24 * 60) {
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const dayText = `${days} ${days === 1 ? "day" : "days"}`;
  return hours > 0 ? `${dayText} ${hours} h` : dayText;
}
