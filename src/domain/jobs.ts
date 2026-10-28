/**
 * Posting work (brief §4.3): job types, the post-work steps, turning dates
 * and times into shifts, and the checks before a job can be posted.
 */

export const JOB_TYPES = {
  single: {
    label: "One shift",
    description: "A single shift on one day.",
  },
  multi_day: {
    label: "Several days",
    description: "The same hours over a run of days, like Monday to Friday.",
  },
  urgent: {
    label: "Urgent call-out",
    description:
      "As soon as possible, at a higher rate. Sent to every eligible worker nearby.",
  },
} as const;

export type JobType = keyof typeof JOB_TYPES;

export const FILL_MODES = {
  pick: {
    label: "I'll choose",
    description:
      "Workers apply and you pick who you want from their ratings and tickets.",
  },
  auto: {
    label: "First in",
    description:
      "The first eligible workers to accept are booked straight away.",
  },
} as const;

export type FillMode = keyof typeof FILL_MODES;

export const PPE_SUPPLIERS = {
  business: "We supply it",
  worker: "Workers bring their own",
  both: "Some of each (say which below)",
} as const;

export type PpeSupplier = keyof typeof PPE_SUPPLIERS;

export const POST_STEPS = [
  { key: "what", title: "What and where" },
  { key: "when", title: "When" },
  { key: "needs", title: "Tickets and instructions" },
  { key: "safety", title: "Safety" },
  { key: "review", title: "Check and post" },
] as const;

export type PostStepKey = (typeof POST_STEPS)[number]["key"];

const STEP_KEYS: PostStepKey[] = POST_STEPS.map((step) => step.key);

export function isPostStep(value: string): value is PostStepKey {
  return (STEP_KEYS as string[]).includes(value);
}

export function nextPostStep(key: PostStepKey): PostStepKey {
  return STEP_KEYS[STEP_KEYS.indexOf(key) + 1] ?? "review";
}

export function previousPostStep(key: PostStepKey): PostStepKey | null {
  return STEP_KEYS[STEP_KEYS.indexOf(key) - 1] ?? null;
}

/** Where to pick up a draft: the first step not done yet. */
export function resumePostStep(done: readonly string[]): PostStepKey {
  return STEP_KEYS.find((key) => !done.includes(key)) ?? "review";
}

export const MAX_WORKERS = 50;
export const MAX_SHIFTS = 40;
export const MAX_SHIFT_HOURS = 14;
export const MAX_BREAK_MINUTES = 120;
/** How far ahead work can be posted. */
export const MAX_DAYS_AHEAD = 180;

const DAY = 86_400_000;

/** yyyy-mm-dd plus whole days. */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a calendar date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * The dates from `from` to `to` (inclusive, yyyy-mm-dd) that fall on the
 * chosen weekdays (0 = Sunday).
 */
export function datesInRange(
  from: string,
  to: string,
  weekdays: readonly number[],
): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (weekdays.includes(weekdayOf(date))) dates.push(date);
    if (dates.length > MAX_SHIFTS) break;
  }
  return dates;
}

/** "07:30" → minutes after midnight. */
function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * How long a shift lasts in minutes of wall-clock time. A finish at or
 * before the start is the next morning (an overnight shift).
 */
export function shiftLengthMinutes(start: string, end: string): number {
  const length = minutesOf(end) - minutesOf(start);
  return length > 0 ? length : length + 24 * 60;
}

export function isOvernightShift(start: string, end: string): boolean {
  return minutesOf(end) <= minutesOf(start);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What's wrong with a shift's times and break, if anything. */
export function shiftTimesProblem(
  start: string,
  end: string,
  breakMinutes: number,
): string | null {
  if (!TIME.test(start)) return "Enter a start time";
  if (!TIME.test(end)) return "Enter a finish time";
  const length = shiftLengthMinutes(start, end);
  if (length > MAX_SHIFT_HOURS * 60) {
    return `A shift can be up to ${MAX_SHIFT_HOURS} hours. Split longer work into two shifts.`;
  }
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    return "Enter the break in whole minutes";
  }
  if (breakMinutes > MAX_BREAK_MINUTES) {
    return `Breaks can be up to ${MAX_BREAK_MINUTES} minutes`;
  }
  if (breakMinutes >= length) return "The break must be shorter than the shift";
  return null;
}

/** What's wrong with the dates of a job, if anything. `today` is yyyy-mm-dd. */
export function datesProblem(
  dates: readonly string[],
  today: string,
): string | null {
  if (dates.length === 0) return "Choose at least one day";
  if (dates.length > MAX_SHIFTS) {
    return `Post up to ${MAX_SHIFTS} shifts at a time`;
  }
  if (dates.some((date) => date < today)) return "That date has passed";
  if (dates.some((date) => date > addDays(today, MAX_DAYS_AHEAD))) {
    return `Post work up to ${MAX_DAYS_AHEAD} days ahead`;
  }
  return null;
}

/** What's missing from the safety section (brief §4.3: required before posting). */
export function safetyProblem(safety: {
  hazardCount: number;
  noKnownHazards: boolean;
  controls: string;
}): string | null {
  if (safety.noKnownHazards && safety.hazardCount > 0) {
    return "You've ticked hazards and 'No known hazards'. Choose one or the other.";
  }
  if (!safety.noKnownHazards && safety.hazardCount === 0) {
    return "Tick the hazards on site, or 'No known hazards'";
  }
  if (safety.hazardCount > 0 && safety.controls.trim() === "") {
    return "Describe the controls in place for these hazards";
  }
  return null;
}

export type JobSnapshot = {
  siteId: string | null;
  categoryId: string | null;
  shiftCount: number;
  /** Earliest shift start, if there are shifts. */
  firstStart: Date | null;
  hazardCount: number;
  noKnownHazards: boolean;
  controls: string;
};

/** The steps that still need something before the job can be posted. */
export function missingPostSteps(job: JobSnapshot, now: Date): PostStepKey[] {
  const missing: PostStepKey[] = [];
  if (!job.siteId || !job.categoryId) missing.push("what");
  if (job.shiftCount === 0 || !job.firstStart || job.firstStart <= now) {
    missing.push("when");
  }
  if (safetyProblem(job)) missing.push("safety");
  return missing;
}

/**
 * Why a business can't post work yet, or null if it can. Posting needs
 * approval, account terms (v1 has no card payments) and the current
 * services agreement.
 */
export function postingBlocker(business: {
  status: string;
  accountTermsApproved: boolean;
  agreementAccepted: boolean;
}): string | null {
  if (business.status !== "approved") {
    return "You can post work once your business is approved.";
  }
  if (!business.accountTermsApproved) {
    return "We're still setting up your account terms. You can post work once that's done.";
  }
  if (!business.agreementAccepted) {
    return "Accept the updated Labour Hire Services Agreement in Settings first.";
  }
  return null;
}

/**
 * The earliest sensible start for an urgent call-out: an hour from now, on
 * the quarter hour. (Australian time zones are all whole quarter hours from
 * UTC, so this is a quarter hour locally too.)
 */
export function urgentStartAt(now: Date): Date {
  const quarter = 15 * 60_000;
  return new Date(Math.ceil((now.getTime() + 60 * 60_000) / quarter) * quarter);
}
