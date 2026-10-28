import { formatDayShort, formatTime } from "./format";

type ShiftTimes = { starts_at: string; ends_at: string };

/** "7:00 am – 3:30 pm" */
export function shiftHours(shift: ShiftTimes): string {
  return `${formatTime(shift.starts_at)} – ${formatTime(shift.ends_at)}`;
}

/**
 * A short description of when a job's shifts are: "Wed 4 Nov, 7:00 am –
 * 3:30 pm", or "5 shifts, Mon 2 Nov – Fri 6 Nov, 7:00 am – 3:30 pm".
 */
export function shiftSummary(shifts: readonly ShiftTimes[]): string {
  const sorted = [...shifts].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return "No dates yet";
  if (sorted.length === 1) {
    return `${formatDayShort(first.starts_at)}, ${shiftHours(first)}`;
  }
  const sameHours = sorted.every((s) => shiftHours(s) === shiftHours(first));
  return `${sorted.length} shifts, ${formatDayShort(first.starts_at)} – ${formatDayShort(last.starts_at)}, ${sameHours ? shiftHours(first) : "various times"}`;
}

/** "Restoration labourer at Granville flood job" */
export function jobTitle(
  categoryName: string | null | undefined,
  siteName: string | null | undefined,
): string {
  if (categoryName && siteName) return `${categoryName} at ${siteName}`;
  return categoryName ?? (siteName ? `Work at ${siteName}` : "New job");
}

export function workersLabel(count: number): string {
  return count === 1 ? "1 worker" : `${count} workers`;
}
