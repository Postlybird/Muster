import { formatCents } from "./format";
import type { Database } from "./supabase/database.types";

type OfferRow =
  Database["public"]["Functions"]["my_shift_offers"]["Returns"][number];

/**
 * One shift offered to the signed-in worker (from my_shift_offers()). Pay
 * and distance can be missing, whatever the generated types say.
 */
export type ShiftOffer = Omit<
  OfferRow,
  "hourly_cents" | "estimate_cents" | "distance_km"
> & {
  hourly_cents: number | null;
  estimate_cents: number | null;
  distance_km: number | null;
};

/** A job's offered shifts, shown together (a multi-day job is one offer). */
export type JobOffer = {
  jobId: string;
  first: ShiftOffer;
  shifts: ShiftOffer[];
  /** Pay for all the offered shifts, when every one has been worked out. */
  totalCents: number | null;
};

/** Groups offered shifts by job, soonest first. */
export function groupOffers(rows: readonly ShiftOffer[]): JobOffer[] {
  const byJob = new Map<string, ShiftOffer[]>();
  const sorted = [...rows].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  for (const row of sorted) {
    byJob.set(row.job_id, [...(byJob.get(row.job_id) ?? []), row]);
  }
  return [...byJob].map(([jobId, shifts]) => ({
    jobId,
    first: shifts[0]!,
    shifts,
    totalCents: shifts.every((s) => s.estimate_cents !== null)
      ? shifts.reduce((sum, s) => sum + (s.estimate_cents ?? 0), 0)
      : null,
  }));
}

/** "4.2 km away", or "4.2 km from home" */
export function distanceLabel(
  km: number | null,
  suffix = "away",
): string | null {
  if (km === null) return null;
  return `${km.toLocaleString("en-AU", { maximumFractionDigits: 1 })} km ${suffix}`;
}

/** "$33.13 an hour · about $132.52 for the shift" */
export function payLabel(offer: JobOffer): string {
  const hourly = offer.first.hourly_cents;
  if (!hourly) return "Pay to be confirmed";
  const total =
    offer.totalCents === null
      ? ""
      : offer.shifts.length === 1
        ? ` · about ${formatCents(offer.totalCents)} for the shift`
        : ` · about ${formatCents(offer.totalCents)} for all ${offer.shifts.length} shifts`;
  return `${formatCents(hourly)} an hour${total}`;
}

/** "No known hazards" or "Hazards: Mould, Heights" */
export function hazardsLabel(offer: ShiftOffer): string {
  if (offer.no_known_hazards || offer.hazards.length === 0) {
    return "No known hazards";
  }
  return `Hazards: ${offer.hazards.join(", ")}`;
}
