/**
 * Worker onboarding (brief §4.1): the wizard steps, date rules and what's
 * still missing before a worker can submit. Pure functions; dates are
 * calendar dates as "yyyy-mm-dd" strings.
 */

export type OnboardingStep = {
  key: string;
  title: string;
  optional?: boolean;
};

export const ONBOARDING_STEPS = [
  { key: "about", title: "About you" },
  { key: "contact", title: "Contact details" },
  { key: "travel", title: "Getting to work" },
  { key: "right-to-work", title: "Right to work" },
  { key: "identity", title: "Photo ID" },
  { key: "work-types", title: "Work types" },
  { key: "tickets", title: "Tickets", optional: true },
  { key: "availability", title: "Availability" },
  { key: "paperwork", title: "Employment paperwork" },
  { key: "submit", title: "Check and submit" },
] as const satisfies readonly OnboardingStep[];

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export const STEP_KEYS: OnboardingStepKey[] = ONBOARDING_STEPS.map(
  (step) => step.key,
);

export function isStepKey(value: string): value is OnboardingStepKey {
  return (STEP_KEYS as string[]).includes(value);
}

export function stepTitle(key: OnboardingStepKey): string {
  return ONBOARDING_STEPS.find((step) => step.key === key)?.title ?? key;
}

export function nextStep(key: OnboardingStepKey): OnboardingStepKey | null {
  return STEP_KEYS[STEP_KEYS.indexOf(key) + 1] ?? null;
}

export function previousStep(key: OnboardingStepKey): OnboardingStepKey | null {
  return STEP_KEYS[STEP_KEYS.indexOf(key) - 1] ?? null;
}

/** Where to pick up: the first step not finished yet, or the final check. */
export function resumeStep(done: readonly string[]): OnboardingStepKey {
  return (
    STEP_KEYS.find((key) => key !== "submit" && !done.includes(key)) ??
    "submit"
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: string): [number, number, number] {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Not a date: ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** A real calendar date from typed day, month and year, or null. */
export function dateFromParts(
  day: string,
  month: string,
  year: string,
): string | null {
  if (!/^\d{1,2}$/.test(day.trim()) || !/^\d{1,2}$/.test(month.trim())) {
    return null;
  }
  if (!/^\d{4}$/.test(year.trim())) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = parts(value);
  return dateFromParts(String(d), String(m), String(y)) === value;
}

/** Whole years old on a date. Someone born on 29 February turns a year older on 1 March. */
export function ageOn(dateOfBirth: string, on: string): number {
  const [by, bm, bd] = parts(dateOfBirth);
  const [y, m, d] = parts(on);
  const hadBirthday = m > bm || (m === bm && d >= bd);
  return y - by - (hadBirthday ? 0 : 1);
}

/** Adds calendar months, clamping to the end of shorter months (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = parts(date);
  const totalMonths = y * 12 + (m - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${pad(year, 4)}-${pad(month + 1)}-${pad(Math.min(d, lastDay))}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return result.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** Problems with a date of birth, keyed for the form. */
export function dateOfBirthProblem(
  dateOfBirth: string,
  today: string,
  minAge: number,
): string | null {
  if (dateOfBirth >= today) return "Enter your date of birth, not today's date";
  if (ageOn(dateOfBirth, today) > 100) return "Check the year you were born";
  if (ageOn(dateOfBirth, today) < minAge) {
    return `You need to be at least ${minAge} to work with us`;
  }
  return null;
}

export type TicketDates = {
  issuedOn: string | null;
  expiresOn: string | null;
};

/** Problems with a ticket's dates, by field. */
export function ticketDateProblems(
  { issuedOn, expiresOn }: TicketDates,
  today: string,
  options: { needsExpiry: boolean },
): { issued_on?: string; expires_on?: string } {
  const problems: { issued_on?: string; expires_on?: string } = {};
  if (issuedOn && issuedOn > today) {
    problems.issued_on = "The issue date can't be in the future";
  }
  if (options.needsExpiry && !expiresOn) {
    problems.expires_on = "Enter the expiry date";
  } else if (expiresOn && expiresOn < today) {
    problems.expires_on =
      "This has expired. Add your renewed ticket instead, or leave it out for now.";
  } else if (issuedOn && expiresOn && expiresOn < issuedOn) {
    problems.expires_on = "The expiry date is before the issue date";
  }
  return problems;
}

/** The last day a police check is accepted: its issue date plus the maximum age (brief §4.1 step 7). */
export function policeCheckAcceptedUntil(
  issuedOn: string,
  maxAgeMonths: number,
): string {
  return addDays(addMonths(issuedOn, maxAgeMonths), -1);
}

/** Problems with a police check's issue date. */
export function policeCheckProblem(
  issuedOn: string | null,
  today: string,
  maxAgeMonths: number,
): string | null {
  if (!issuedOn) return "Enter the date the check was issued";
  if (issuedOn > today) return "The issue date can't be in the future";
  if (policeCheckAcceptedUntil(issuedOn, maxAgeMonths) < today) {
    return `We accept checks issued in the last ${maxAgeMonths} months. Get a new one, then upload it.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ready to submit?
// ---------------------------------------------------------------------------

export type OnboardingSnapshot = {
  legalFirstName: string | null;
  legalLastName: string | null;
  dateOfBirth: string | null;
  photoPath: string | null;
  email: string | null;
  phone: string | null;
  homeSuburb: string | null;
  hasRightToWork: boolean;
  hasIdentityCheck: boolean;
  categoryCount: number;
  /** Current employment documents not yet accepted. */
  unacceptedDocuments: number;
};

/** Required steps that still need something, in wizard order. */
export function missingSteps(
  snapshot: OnboardingSnapshot,
): OnboardingStepKey[] {
  const missing: OnboardingStepKey[] = [];
  if (
    !snapshot.legalFirstName ||
    !snapshot.legalLastName ||
    !snapshot.dateOfBirth ||
    !snapshot.photoPath
  ) {
    missing.push("about");
  }
  if (!snapshot.email || !snapshot.phone) missing.push("contact");
  if (!snapshot.homeSuburb) missing.push("travel");
  if (!snapshot.hasRightToWork) missing.push("right-to-work");
  if (!snapshot.hasIdentityCheck) missing.push("identity");
  if (snapshot.categoryCount === 0) missing.push("work-types");
  if (snapshot.unacceptedDocuments > 0) missing.push("paperwork");
  return missing;
}
