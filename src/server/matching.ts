import "server-only";

import { formatCents, formatDayShort, formatTime, zoneOf } from "@/lib/format";
import { matchJob, matchWorker, type UrgentOffer } from "@/lib/matching";
import { createAdminClient } from "@/lib/supabase/admin";

import { notify } from "./notifications";
import { getAllSettings } from "./settings";

/**
 * Tells the workers who opted in about urgent call-outs (brief §4.3, §5):
 * one message per worker, for their first offered shift.
 */
async function notifyUrgentOffers(offers: UrgentOffer[]) {
  const first = new Map<string, string>();
  for (const offer of offers) {
    if (!first.has(offer.profileId)) first.set(offer.profileId, offer.shiftId);
  }
  if (first.size === 0) return;
  const admin = createAdminClient();
  const { data: shifts } = await admin
    .from("shifts")
    .select(
      "id, job_id, starts_at, jobs(fill_mode, categories(name), sites(suburb, state)), shift_pay(estimate_cents)",
    )
    .in("id", [...new Set(first.values())]);
  await Promise.all(
    [...first].map(([profileId, shiftId]) => {
      const shift = shifts?.find((s) => s.id === shiftId);
      if (!shift) return null;
      const timeZone = zoneOf(shift.jobs?.sites?.state);
      return notify(
        "urgent_offer",
        profileId,
        {
          work: shift.jobs?.categories?.name ?? "a shift",
          suburb: shift.jobs?.sites?.suburb ?? "your area",
          when: `${formatDayShort(shift.starts_at, timeZone)} from ${formatTime(shift.starts_at, timeZone)}`,
          pay: shift.shift_pay?.estimate_cents
            ? `About ${formatCents(shift.shift_pay.estimate_cents)} with the urgent loading.`
            : "",
          how:
            shift.jobs?.fill_mode === "auto" ? "First in gets it" : "Apply now",
        },
        {
          url: `/worker/shifts/${shift.job_id}`,
          dedupeKey: `urgent_offer:${shift.id}:${profileId}`,
        },
      );
    }),
  );
}

/**
 * Matches workers to a job that's just been posted, and texts urgent
 * call-outs. A failure is logged, never shown: the job is posted either way.
 */
export async function matchPostedJob(jobId: string) {
  try {
    const offers = await matchJob(
      createAdminClient(),
      jobId,
      await getAllSettings(),
    );
    await notifyUrgentOffers(offers);
  } catch (error) {
    console.error("Couldn't match workers to a job", error);
  }
}

/**
 * Brings a worker's offers up to date: when they're activated or a check is
 * decided, and when they open the shift feed after changing their work
 * types, travel distance or blocked dates. Someone already looking at their
 * offers isn't texted about them.
 */
export async function refreshWorkerMatches(
  workerId: string,
  { notify = true }: { notify?: boolean } = {},
) {
  try {
    const offers = await matchWorker(
      createAdminClient(),
      workerId,
      await getAllSettings(),
      { notify },
    );
    await notifyUrgentOffers(offers);
  } catch (error) {
    console.error("Couldn't match a worker to shifts", error);
  }
}
