"use server";

import { fromZonedTime } from "date-fns-tz";

import {
  datesInRange,
  datesProblem,
  isOvernightShift,
  MAX_SHIFT_HOURS,
  shiftTimesProblem,
} from "@/domain/jobs";
import { STATE_TIME_ZONES, type StateCode } from "@/domain/pay";
import { isIsoDate } from "@/domain/onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { sydneyDateKey } from "@/lib/format";
import { saveFailed } from "@/server/errors";
import { draftForAction, finishPostStep } from "@/server/jobs";

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function fieldError(field: string, message: string): ActionState {
  return failure("Check the highlighted fields.", { [field]: [message] });
}

/** The dates and times of the job's shifts (brief §4.3). */
export async function saveWhen(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const draft = await draftForAction(jobId);
  if (!draft) return failure("This job can't be changed any more.");
  const { job, supabase } = draft;
  const { data: site } = job.site_id
    ? await supabase
        .from("sites")
        .select("state")
        .eq("id", job.site_id)
        .maybeSingle()
    : { data: null };
  if (!site) return failure("Choose a site first.");
  const timeZone = STATE_TIME_ZONES[site.state as StateCode];

  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const breakMinutes = Number(formData.get("break_minutes") ?? 0);
  const timesProblem = shiftTimesProblem(start, end, breakMinutes);
  if (timesProblem) {
    const field = timesProblem.includes("start")
      ? "start"
      : timesProblem.includes("finish") || timesProblem.includes("hours")
        ? "end"
        : "break_minutes";
    return fieldError(field, timesProblem);
  }

  let dates: string[];
  if (job.type === "multi_day") {
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");
    const weekdays = formData.getAll("weekdays").map(Number);
    if (!isIsoDate(from)) return fieldError("from", "Choose the first day");
    if (!isIsoDate(to)) return fieldError("to", "Choose the last day");
    if (to < from)
      return fieldError("to", "The last day can't be before the first");
    if (weekdays.length === 0) {
      return fieldError("weekdays", "Choose at least one day of the week");
    }
    dates = datesInRange(from, to, weekdays);
  } else {
    const date = String(formData.get("date") ?? "");
    if (!isIsoDate(date)) return fieldError("date", "Choose the date");
    dates = [date];
  }
  const datesError = datesProblem(dates, sydneyDateKey(new Date()));
  if (datesError) {
    return fieldError(job.type === "multi_day" ? "from" : "date", datesError);
  }

  const now = Date.now();
  const shifts = dates.map((date) => {
    const startsAt = fromZonedTime(`${date}T${start}:00`, timeZone);
    const endsAt = fromZonedTime(
      `${isOvernightShift(start, end) ? nextDay(date) : date}T${end}:00`,
      timeZone,
    );
    return { startsAt, endsAt };
  });
  if (shifts.some((shift) => shift.startsAt.getTime() <= now)) {
    return fieldError("start", "That start time has passed");
  }
  // Daylight saving can stretch a shift that crosses the change.
  if (
    shifts.some(
      (shift) =>
        shift.endsAt.getTime() - shift.startsAt.getTime() >
        MAX_SHIFT_HOURS * 3_600_000,
    )
  ) {
    return fieldError(
      "end",
      `A shift can be up to ${MAX_SHIFT_HOURS} hours. Split longer work into two shifts.`,
    );
  }

  const { error: clearError } = await supabase
    .from("shifts")
    .delete()
    .eq("job_id", job.id);
  if (clearError) return saveFailed(clearError);
  const { error } = await supabase.from("shifts").insert(
    shifts.map((shift) => ({
      job_id: job.id,
      starts_at: shift.startsAt.toISOString(),
      ends_at: shift.endsAt.toISOString(),
      break_minutes: breakMinutes,
      headcount: job.headcount,
    })),
  );
  if (error) return saveFailed(error);
  return finishPostStep(job, "when");
}
