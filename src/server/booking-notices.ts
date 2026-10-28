import "server-only";

import { formatDayShort, formatTime } from "@/lib/format";
import { shiftSummary } from "@/lib/job-format";
import { createAdminClient } from "@/lib/supabase/admin";

import { emailPerson, textPerson } from "./notify";
import { requestOrigin } from "./request";

/**
 * Messages about bookings. Until notifications arrive in step 1.14, workers
 * are texted and businesses emailed; these look up who to tell with the
 * service-role key, like notify.ts.
 */

async function jobFacts(jobId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select(
      "id, posted_by, categories(name), sites(name, suburb), businesses(trading_name, legal_name), shifts(id, starts_at, ends_at, status)",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return null;
  return {
    postedBy: data.posted_by,
    category: data.categories?.name ?? "Work",
    site: data.sites?.name ?? "your site",
    suburb: data.sites?.suburb ?? "",
    business:
      data.businesses?.trading_name ?? data.businesses?.legal_name ?? "",
    shifts: data.shifts,
  };
}

/** Tells a worker the business picked them, with a link to the address. */
export async function textBooked(
  workerId: string,
  jobId: string,
  shiftIds: readonly string[],
) {
  const admin = createAdminClient();
  const [{ data: worker }, job] = await Promise.all([
    admin.from("workers").select("profile_id").eq("id", workerId).single(),
    jobFacts(jobId),
  ]);
  if (!worker || !job) return;
  const booked = job.shifts.filter((s) => shiftIds.includes(s.id));
  if (booked.length === 0) return;
  const origin = await requestOrigin();
  await textPerson(
    worker.profile_id,
    `You're booked: ${job.category} for ${job.business} in ${job.suburb}, ${shiftSummary(booked)}. See the address and who to report to: ${origin}/worker/shifts/${jobId}`,
  );
}

/**
 * Claims a once-only email about a job: true for the first caller only, so
 * two people applying or accepting at once never send it twice.
 */
async function claim(
  jobId: string,
  column: "first_applicant_emailed_at" | "filled_emailed_at",
): Promise<boolean> {
  const admin = createAdminClient();
  const sent = new Date().toISOString();
  const { data } = await admin
    .from("jobs")
    .update(
      column === "filled_emailed_at"
        ? { filled_emailed_at: sent }
        : { first_applicant_emailed_at: sent },
    )
    .eq("id", jobId)
    .is(column, null)
    .select("id");
  return (data ?? []).length > 0;
}

/** Emails whoever posted a job when its first worker applies. */
export async function emailFirstApplicant(jobId: string) {
  const job = await jobFacts(jobId);
  if (!job?.postedBy || !(await claim(jobId, "first_applicant_emailed_at"))) {
    return;
  }
  const origin = await requestOrigin();
  await emailPerson(job.postedBy, {
    subject: `Your first applicant: ${job.category} at ${job.site}`,
    text: `Someone has applied for ${job.category} at ${job.site} (${shiftSummary(job.shifts)}).\n\nSee their rating, reliability and tickets, and book who you want: ${origin}/business/jobs/${jobId}`,
    tag: "job-applicants",
  });
}

/** Emails whoever posted a "First in" job once every shift is booked. */
export async function emailIfFilled(jobId: string) {
  const job = await jobFacts(jobId);
  if (!job?.postedBy || job.shifts.length === 0) return;
  if (job.shifts.some((s) => s.status === "open")) return;
  if (!(await claim(jobId, "filled_emailed_at"))) return;
  const origin = await requestOrigin();
  const first = [...job.shifts].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  )[0]!;
  await emailPerson(job.postedBy, {
    subject: `All booked: ${job.category} at ${job.site}`,
    text: `Every shift of ${job.category} at ${job.site} is now booked, starting ${formatDayShort(first.starts_at)} at ${formatTime(first.starts_at)}.\n\nSee who's coming and their mobile numbers: ${origin}/business/jobs/${jobId}`,
    tag: "job-filled",
  });
}
