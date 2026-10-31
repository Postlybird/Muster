/**
 * Badges on a worker's card and profile (owner's go-ahead, 31/10/2026):
 * plain words a business can trust at a glance, worked out from what we
 * know. Plain badges rather than tiers like Gold and Silver, because they
 * say what they mean.
 */

export type BadgeFacts = {
  rating: number | null;
  ratingCount: number;
  reliability: number | null;
  shiftsCompleted: number;
  /** Shifts they've worked for this business, with the hours approved. */
  shiftsHere: number;
  favourite: boolean;
  /** Years in the job's type of work, as they told us, when a job is in view. */
  yearsInWork?: number | null;
};

export type BadgeKey =
  | "favourite"
  | "worked_here"
  | "top_rated"
  | "very_reliable"
  | "experienced"
  | "new";

export type Badge = { key: BadgeKey; label: string; description: string };

export const TOP_RATED = { minRating: 4.7, minRatings: 5 } as const;
export const VERY_RELIABLE = { minScore: 95, minShifts: 10 } as const;
export const EXPERIENCED_YEARS = 5;
/** Fewer shifts than this with us and they're new. */
export const NEW_WORKER_SHIFTS = 3;

/** The badges a worker has earned, most telling first. */
export function workerBadges(facts: BadgeFacts): Badge[] {
  const badges: Badge[] = [];
  if (facts.favourite) {
    badges.push({
      key: "favourite",
      label: "Your favourite",
      description:
        "On your favourites list, so they hear about your work first.",
    });
  }
  if (facts.shiftsHere > 0) {
    badges.push({
      key: "worked_here",
      label:
        facts.shiftsHere === 1
          ? "Worked with you once"
          : `Worked with you ${facts.shiftsHere} times`,
      description: "Shifts with you, with the hours approved.",
    });
  }
  if (
    facts.rating !== null &&
    facts.ratingCount >= TOP_RATED.minRatings &&
    facts.rating >= TOP_RATED.minRating
  ) {
    badges.push({
      key: "top_rated",
      label: "Top rated",
      description: `${TOP_RATED.minRating} stars or more from at least ${TOP_RATED.minRatings} businesses' ratings.`,
    });
  }
  if (
    facts.reliability !== null &&
    facts.shiftsCompleted >= VERY_RELIABLE.minShifts &&
    facts.reliability >= VERY_RELIABLE.minScore
  ) {
    badges.push({
      key: "very_reliable",
      label: "Very reliable",
      description: `Turns up as booked: ${VERY_RELIABLE.minScore}% or more over their recent shifts.`,
    });
  }
  if ((facts.yearsInWork ?? 0) >= EXPERIENCED_YEARS) {
    badges.push({
      key: "experienced",
      label: `${EXPERIENCED_YEARS}+ years' experience`,
      description: `${EXPERIENCED_YEARS} years or more in this type of work, as they told us.`,
    });
  }
  if (facts.shiftsCompleted < NEW_WORKER_SHIFTS) {
    badges.push({
      key: "new",
      label: "New to Shifta",
      description: `Fewer than ${NEW_WORKER_SHIFTS} shifts with us so far. Our team has checked their ID, right to work and tickets.`,
    });
  }
  return badges;
}
