import { workedMinutes } from "@/domain/timesheets";

import { formatHours, formatTime } from "./format";

type Hours = { start_at: string; finish_at: string; break_minutes: number };

/** "7:00 am – 3:04 pm, 30-minute break", in the site's time zone. */
export function hoursLabel(hours: Hours, timeZone: string): string {
  const times = `${formatTime(hours.start_at, timeZone)} – ${formatTime(hours.finish_at, timeZone)}`;
  return hours.break_minutes
    ? `${times}, ${hours.break_minutes}-minute break`
    : `${times}, no break`;
}

/** "7.57 h" worked. */
export function workedLabel(hours: Hours): string {
  return formatHours(
    workedMinutes({
      start: new Date(hours.start_at),
      finish: new Date(hours.finish_at),
      breakMinutes: hours.break_minutes,
    }),
  );
}

/** A worker's name as the business sees it once booked. */
export function workerName(worker: {
  preferred_name: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
}): string {
  return `${worker.preferred_name ?? worker.legal_first_name ?? "A worker"} ${worker.legal_last_name ?? ""}`.trim();
}
