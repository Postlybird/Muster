import { policeCheckAcceptedUntil } from "./onboarding";

/**
 * Who can work a shift (brief §4.4 hard rules) and the order they're offered
 * it (ranking). Pure functions: the caller loads workers, shifts and
 * settings. Dates are yyyy-mm-dd in the site's local time.
 */

export type IneligibleReason =
  | "not_active"
  | "blocked"
  | "no_work_type"
  | "level"
  | "ticket_missing"
  | "ticket_expired"
  | "right_to_work"
  | "police_check"
  | "too_far"
  | "date_blocked"
  | "overlapping_shift";

/** Plain words for admins looking at why someone wasn't offered a shift. */
export const INELIGIBLE_REASONS: Record<IneligibleReason, string> = {
  not_active: "Not active",
  blocked: "Blocked by this business",
  no_work_type: "Doesn't do this type of work",
  level: "Level too low for this job",
  ticket_missing: "Missing a required ticket",
  ticket_expired: "A required ticket expires before the shift",
  right_to_work: "Right to work not confirmed for the shift date",
  police_check: "No current police check",
  too_far: "Outside their travel distance",
  date_blocked: "Not available that day",
  overlapping_shift: "Already booked at that time",
};

export type WorkerFacts = {
  id: string;
  status: string;
  lat: number | null;
  lng: number | null;
  travelRadiusKm: number;
  categories: { categoryId: string; level: number; yearsExperience: number }[];
  /** Verified tickets only. */
  credentials: {
    typeId: string;
    kind: string;
    issuedOn: string | null;
    expiresOn: string | null;
  }[];
  rightToWork: {
    status: string;
    basis: string;
    visaExpiry: string | null;
    nextCheckDue: string | null;
    workLimitFlag: boolean;
  } | null;
  blockedDates: readonly string[];
  /** Shifts they're already booked on. */
  bookings: readonly { start: Date; end: Date }[];
};

export type ShiftFacts = {
  businessId: string;
  categoryId: string;
  level: number;
  start: Date;
  end: Date;
  /** The local date the shift starts on. */
  date: string;
  siteLat: number;
  siteLng: number;
  requiredTicketTypeIds: readonly string[];
  policeCheckRequired: boolean;
};

export type MatchRules = {
  /** Workers this business has blocked. */
  blockedWorkerIds: ReadonlySet<string>;
  policeCheckMaxAgeMonths: number;
};

export type Eligibility = {
  eligible: boolean;
  reasons: IneligibleReason[];
  /** Straight-line distance from home to the site (plan: distance is straight-line). */
  distanceKm: number | null;
  /** For admin attention, not a block (brief §4.4: visa work-hour limits). */
  flags: "work_limit"[];
};

const EARTH_RADIUS_KM = 6371;

/** Straight-line (great-circle) distance in kilometres. */
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Whether the worker's right to work is confirmed for a date. */
function rightToWorkValid(
  rights: WorkerFacts["rightToWork"],
  date: string,
): boolean {
  if (!rights || rights.status !== "verified") return false;
  if (rights.basis !== "visa") return true;
  // A visa holds until it expires; one with no end date until its next VEVO check.
  const until = rights.visaExpiry ?? rights.nextCheckDue;
  return !until || until >= date;
}

/** Checks every hard rule (brief §4.4) and lists the ones that fail. */
export function checkEligibility(
  worker: WorkerFacts,
  shift: ShiftFacts,
  rules: MatchRules,
): Eligibility {
  const reasons: IneligibleReason[] = [];
  if (worker.status !== "active") reasons.push("not_active");
  if (rules.blockedWorkerIds.has(worker.id)) reasons.push("blocked");

  const workType = worker.categories.find(
    (c) => c.categoryId === shift.categoryId,
  );
  if (!workType) reasons.push("no_work_type");
  else if (workType.level < shift.level) reasons.push("level");

  for (const typeId of shift.requiredTicketTypeIds) {
    const held = worker.credentials.filter((c) => c.typeId === typeId);
    if (held.length === 0) {
      reasons.push("ticket_missing");
    } else if (!held.some((c) => !c.expiresOn || c.expiresOn >= shift.date)) {
      reasons.push("ticket_expired");
    }
  }

  if (!rightToWorkValid(worker.rightToWork, shift.date)) {
    reasons.push("right_to_work");
  }

  if (
    shift.policeCheckRequired &&
    !worker.credentials.some(
      (c) =>
        c.kind === "police_check" &&
        !!c.issuedOn &&
        policeCheckAcceptedUntil(c.issuedOn, rules.policeCheckMaxAgeMonths) >=
          shift.date,
    )
  ) {
    reasons.push("police_check");
  }

  const distance =
    worker.lat === null || worker.lng === null
      ? null
      : distanceKm(worker.lat, worker.lng, shift.siteLat, shift.siteLng);
  if (distance === null || distance > worker.travelRadiusKm) {
    reasons.push("too_far");
  }

  if (worker.blockedDates.includes(shift.date)) reasons.push("date_blocked");
  if (
    worker.bookings.some(
      (booking) => booking.start < shift.end && booking.end > shift.start,
    )
  ) {
    reasons.push("overlapping_shift");
  }

  return {
    eligible: reasons.length === 0,
    reasons: [...new Set(reasons)],
    distanceKm: distance === null ? null : Math.round(distance * 10) / 10,
    flags: worker.rightToWork?.workLimitFlag ? ["work_limit"] : [],
  };
}

export type RankFacts = {
  favourite: boolean;
  shiftsWithBusiness: number;
  /** 1 to 5, or null for someone not rated yet. */
  rating: number | null;
  /** 0 to 100, or null for someone new. */
  reliability: number | null;
  distanceKm: number;
  yearsExperience: number;
};

/**
 * The order workers are offered a shift (brief §4.4): this business's
 * favourites, then past shifts with the business, rating, reliability,
 * distance and experience. New workers count as a 4-star rating and 80%
 * reliability, so they still get offers. Higher is better.
 */
export function rankScore(facts: RankFacts): number {
  return (
    (facts.favourite ? 1000 : 0) +
    Math.min(facts.shiftsWithBusiness, 10) * 20 +
    (facts.rating ?? 4) * 40 +
    (facts.reliability ?? 80) * 2 -
    facts.distanceKm * 2 +
    Math.min(facts.yearsExperience, 10) * 5
  );
}
