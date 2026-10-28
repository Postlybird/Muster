/**
 * Worker availability (brief §4.1 step 8): a weekly pattern, an "available
 * now" switch for urgent work, and blocked-out dates. Weekdays are ISO:
 * 1 = Monday ... 7 = Sunday. A window that ends before it starts runs past
 * midnight.
 */

export const WEEKDAYS = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
  { day: 6, name: "Saturday", short: "Sat" },
  { day: 7, name: "Sunday", short: "Sun" },
] as const;

export type WeeklyWindow = { weekday: number; start: string; end: string };

/** What a new worker sees before changing anything. */
export const DEFAULT_WEEKLY: WeeklyWindow[] = [1, 2, 3, 4, 5].map(
  (weekday) => ({ weekday, start: "07:00", end: "17:00" }),
);

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "07:00" or "07:00:00" (from the database) → "07:00", or null. */
export function normaliseTime(value: string | null | undefined): string | null {
  const text = (value ?? "").trim().slice(0, 5);
  return TIME.test(text) ? text : null;
}

export function isOvernight(start: string, end: string): boolean {
  return end < start;
}

/** A problem with one day's window, or null. */
export function windowProblem(
  start: string | null,
  end: string | null,
): string | null {
  if (!start || !end) return "Enter a start and finish time";
  if (start === end) return "The start and finish times are the same";
  return null;
}

/** "07:00" → "7:00 am", "13:30" → "1:30 pm", "00:00" → "12:00 am". */
export function formatTimeOfDay(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Mon–Fri, 7:00 am to 5:00 pm" style summary for profile pages. */
export function summariseWeekly(windows: readonly WeeklyWindow[]): string {
  if (windows.length === 0) return "No regular days set";
  const sorted = [...windows].sort((a, b) => a.weekday - b.weekday);
  const groups: { days: number[]; start: string; end: string }[] = [];
  for (const w of sorted) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.start === w.start &&
      last.end === w.end &&
      last.days[last.days.length - 1] === w.weekday - 1
    ) {
      last.days.push(w.weekday);
    } else {
      groups.push({ days: [w.weekday], start: w.start, end: w.end });
    }
  }
  const short = (day: number) => WEEKDAYS[day - 1]!.short;
  return groups
    .map((g) => {
      const days =
        g.days.length > 2
          ? `${short(g.days[0]!)}–${short(g.days[g.days.length - 1]!)}`
          : g.days.map(short).join(", ");
      const overnight = isOvernight(g.start, g.end) ? " (next day)" : "";
      return `${days}, ${formatTimeOfDay(g.start)} to ${formatTimeOfDay(g.end)}${overnight}`;
    })
    .join("; ");
}

/** "Available now" lasts this long once switched on. */
export const AVAILABLE_NOW_HOURS = 4;

export function availableNowUntil(now: Date): Date {
  return new Date(now.getTime() + AVAILABLE_NOW_HOURS * 60 * 60 * 1000);
}

export function isAvailableNow(until: string | null, now: Date): boolean {
  return !!until && new Date(until).getTime() > now.getTime();
}
