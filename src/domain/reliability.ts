/**
 * Reliability (brief §4.7): worked shifts versus late cancellations and
 * no-shows, plus punctuality, over a worker's most recent shifts (plan: the
 * last 20, and the weights, are settings). Early cancellations and the
 * business's own cancellations don't count. Separate from rating.
 */

export type ShiftOutcome =
  /** Worked, on time. */
  | "worked"
  /** Worked, but started after the grace period. */
  | "late_arrival"
  | "late_cancellation"
  | "no_show";

export type ReliabilityRules = {
  /** How many of the most recent outcomes count. */
  window: number;
  /** Percent of a worked shift. */
  lateCancelCredit: number;
  lateArrivalCredit: number;
};

/**
 * 0 to 100, one decimal place; null for a worker with no shifts yet
 * ("New"). Outcomes are newest first.
 */
export function reliabilityScore(
  outcomes: readonly ShiftOutcome[],
  rules: ReliabilityRules,
): number | null {
  const recent = outcomes.slice(0, rules.window);
  if (recent.length === 0) return null;
  const credit: Record<ShiftOutcome, number> = {
    worked: 100,
    late_arrival: rules.lateArrivalCredit,
    late_cancellation: rules.lateCancelCredit,
    no_show: 0,
  };
  const total = recent.reduce((sum, outcome) => sum + credit[outcome], 0);
  return Math.round((total / recent.length) * 10) / 10;
}

/** What a booking counts as, if anything yet. */
export function outcomeOf(booking: {
  status: string;
  lateCancellation: boolean;
  /** Their hours are in: a timesheet our team hasn't rejected. */
  worked: boolean;
  /** Their hours started after the grace period. */
  lateArrival: boolean;
}): ShiftOutcome | null {
  switch (booking.status) {
    case "no_show":
      return "no_show";
    case "cancelled_by_worker":
      return booking.lateCancellation ? "late_cancellation" : null;
    case "confirmed":
    case "completed":
      // Counted once their hours are in, not just because the shift is over.
      if (!booking.worked) return null;
      return booking.lateArrival ? "late_arrival" : "worked";
    default:
      return null;
  }
}
