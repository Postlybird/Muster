import type { Eligibility, IneligibleReason } from "./eligibility";
import { policeCheckAcceptedUntil } from "./onboarding";

/**
 * The expiry engine (brief §4.9): warnings before tickets and visas
 * expire, what counts as expired, and what puts a booked shift at risk
 * when it's checked again. Dates are yyyy-mm-dd.
 */

const DAY = 86_400_000;

/** Whole days from one date to another (negative if it's earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY,
  );
}

/**
 * The warning due for something that's good until `until` (a setting
 * lists the days before, e.g. 30, 14 and 7): the nearest one reached, so
 * each goes once even if a day was missed. Null when none is due, or
 * it's already expired.
 */
export function warningDue(
  today: string,
  until: string,
  daysBefore: readonly number[],
): number | null {
  const left = daysBetween(today, until);
  if (left < 0) return null;
  return [...daysBefore].sort((a, b) => a - b).find((d) => left <= d) ?? null;
}

/** Good until the end of `until`, so expired the day after. */
export function isExpired(today: string, until: string): boolean {
  return until < today;
}

/**
 * The last day a ticket counts: its expiry date, or for a police check
 * with none, the day it becomes too old (a setting).
 */
export function validUntil(
  credential: {
    kind: string;
    issuedOn: string | null;
    expiresOn: string | null;
  },
  policeCheckMaxAgeMonths: number,
): string | null {
  if (credential.expiresOn) return credential.expiresOn;
  if (credential.kind === "police_check" && credential.issuedOn) {
    return policeCheckAcceptedUntil(
      credential.issuedOn,
      policeCheckMaxAgeMonths,
    );
  }
  return null;
}

/**
 * What puts a booked shift at risk when it's checked again (brief §4.4:
 * 24 hours before, and §4.9 when something expires): the worker's status
 * and papers. Travel, availability and blocks were settled when they were
 * booked.
 */
export const AT_RISK_REASONS: readonly IneligibleReason[] = [
  "not_active",
  "ticket_missing",
  "ticket_expired",
  "right_to_work",
  "police_check",
];

export function bookingProblems(eligibility: Eligibility): IneligibleReason[] {
  return eligibility.reasons.filter((reason) =>
    AT_RISK_REASONS.includes(reason),
  );
}
