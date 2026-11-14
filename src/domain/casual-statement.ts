import { differenceInMonths } from "date-fns";

/**
 * When a casual is given the Casual Employment Information Statement again
 * (owner, 14/11/2026). Under the Fair Work Act, an employer with 15 or
 * more employees gives it again after 6 months of employment, after 12,
 * and every 12 months after that; a smaller employer only after 12, and
 * giving it more often does no harm, so we follow the larger employer's
 * dates from the start.
 */
export const FIRST_REISSUE_MONTHS = 6;

/**
 * The latest re-issue a worker employed since `employedFrom` is due by
 * `now`, in months of employment (6, 12, 24, 36, ...), or null before 6
 * months. Only the latest is sent, so a worker who passed several dates
 * at once gets one email.
 */
export function casualStatementDue(
  employedFrom: Date,
  now: Date,
): number | null {
  const months = differenceInMonths(now, employedFrom);
  if (months < FIRST_REISSUE_MONTHS) return null;
  if (months < 12) return FIRST_REISSUE_MONTHS;
  return Math.floor(months / 12) * 12;
}
