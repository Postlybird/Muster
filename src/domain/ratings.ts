/**
 * Ratings (brief §4.7): 1 to 5 stars with tags, given once each side's
 * hours are approved. The tag codes match rate_worker() and rate_site() in
 * the database.
 */

/** What a business can say about a worker. */
export const WORKER_TAGS = {
  punctual: "Punctual",
  hard_working: "Hard-working",
  would_rehire: "Would rehire",
  careful: "Careful and safe",
  great_attitude: "Great attitude",
  skilled: "Skilled",
} as const;

/** What a worker can say about a site. */
export const SITE_TAGS = {
  safe_site: "Safe site",
  well_organised: "Well organised",
  clear_instructions: "Clear instructions",
  friendly_team: "Friendly team",
  good_facilities: "Good facilities",
} as const;

export type WorkerTag = keyof typeof WORKER_TAGS;
export type SiteTag = keyof typeof SITE_TAGS;

/** "4.6 stars from 12 ratings", or "No ratings yet". */
export function ratingSummary(average: number | null, count: number): string {
  if (average === null || count === 0) return "No ratings yet";
  const stars = (Math.round(average * 10) / 10).toLocaleString("en-AU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${stars} stars from ${count === 1 ? "1 rating" : `${count} ratings`}`;
}

/** Only the tags offered, each once. */
export function cleanTags<T extends string>(
  chosen: readonly string[],
  allowed: Readonly<Record<T, string>>,
): T[] {
  return [...new Set(chosen)].filter((tag): tag is T => tag in allowed);
}
