import "server-only";

import { formatDayShort, formatTime } from "@/lib/format";
import { shiftSummary } from "@/lib/job-format";
import { createAdminClient } from "@/lib/supabase/admin";

import { notify, notifyAdmins } from "./notifications";

/**
 * Messages about bookings (src/config/notifications.ts has their words).
 * These look up who to tell with the service-role key.
 */

const DAY = 86_400_000;

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

/** Starts within a day: worth sending even in quiet hours. */
function soon(shifts: readonly { starts_at: string }[]): boolean {
  return shifts.some((s) => Date.parse(s.starts_at) - Date.now() < DAY);
}

/** Tells a worker the business picked them, with a link to the address. */
export async function notifyBooked(
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
  await notify(
    "booked",
    worker.profile_id,
    {
      work: job.category,
      business: job.business,
      suburb: job.suburb,
      shifts: shiftSummary(booked),
    },
    { url: `/worker/shifts/${jobId}`, urgent: soon(booked) },
  );
}

/**
 * Claims a once-only message about a job: true for the first caller only,
 * so two people applying or accepting at once never send it twice.
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

/** Tells whoever posted a job when its first worker applies. */
export async function notifyFirstApplicant(jobId: string) {
  const job = await jobFacts(jobId);
  if (!job?.postedBy || !(await claim(jobId, "first_applicant_emailed_at"))) {
    return;
  }
  await notify(
    "first_applicant",
    job.postedBy,
    { work: job.category, site: job.site, shifts: shiftSummary(job.shifts) },
    { url: `/business/jobs/${jobId}` },
  );
}

/** Tells whoever posted a "First in" job once every shift is booked. */
export async function notifyIfFilled(jobId: string) {
  const job = await jobFacts(jobId);
  if (!job?.postedBy || job.shifts.length === 0) return;
  if (job.shifts.some((s) => s.status === "open")) return;
  if (!(await claim(jobId, "filled_emailed_at"))) return;
  const first = [...job.shifts].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  )[0]!;
  await notify(
    "job_filled",
    job.postedBy,
    {
      work: job.category,
      site: job.site,
      start: `${formatDayShort(first.starts_at)} at ${formatTime(first.starts_at)}`,
    },
    { url: `/business/jobs/${jobId}` },
  );
}

/** Tells whoever posted a job that a booked worker can't make it. */
export async function notifyWorkerCancelled(
  jobId: string,
  workerId: string,
  shiftIds: readonly string[],
) {
  const admin = createAdminClient();
  const [job, { data: worker }] = await Promise.all([
    jobFacts(jobId),
    admin
      .from("workers")
      .select("preferred_name, legal_first_name, legal_last_name")
      .eq("id", workerId)
      .single(),
  ]);
  if (!job?.postedBy || !worker) return;
  const name = `${worker.preferred_name ?? worker.legal_first_name ?? "A worker"} ${worker.legal_last_name?.[0] ?? ""}.`;
  const shifts = job.shifts.filter((s) => shiftIds.includes(s.id));
  if (shifts.length === 0) return;
  await notify(
    "worker_cancelled",
    job.postedBy,
    {
      worker: name,
      work: job.category,
      site: job.site,
      shifts: shiftSummary(shifts),
    },
    { url: `/business/jobs/${jobId}`, urgent: soon(shifts) },
  );
}

/** Tells booked workers the business cancelled their shifts. */
export async function notifyShiftsCancelled(
  jobId: string,
  cancelled: readonly { worker_id: string; shift_id: string }[],
) {
  if (cancelled.length === 0) return;
  const admin = createAdminClient();
  const [job, { data: workers }] = await Promise.all([
    jobFacts(jobId),
    admin
      .from("workers")
      .select("id, profile_id")
      .in(
        "id",
        cancelled.map((c) => c.worker_id),
      ),
  ]);
  if (!job) return;
  await Promise.all(
    (workers ?? []).map((worker) => {
      const shiftIds = cancelled
        .filter((c) => c.worker_id === worker.id)
        .map((c) => c.shift_id);
      const shifts = job.shifts.filter((s) => shiftIds.includes(s.id));
      if (shifts.length === 0) return null;
      return notify(
        "shifts_cancelled",
        worker.profile_id,
        {
          business: job.business,
          work: job.category,
          suburb: job.suburb,
          shifts: shiftSummary(shifts),
        },
        { url: "/worker/shifts" },
      );
    }),
  );
}

/** Tells a worker a no-show was recorded, and if that put their account on hold. */
export async function notifyNoShow(
  workerId: string,
  jobId: string,
  suspended: boolean,
) {
  const admin = createAdminClient();
  const [job, { data: worker }] = await Promise.all([
    jobFacts(jobId),
    admin.from("workers").select("profile_id").eq("id", workerId).single(),
  ]);
  if (!job || !worker) return;
  await notify(suspended ? "no_show_suspended" : "no_show", worker.profile_id, {
    business: job.business,
    work: job.category,
    suburb: job.suburb,
  });
}

/** Tells every admin about a safety report straight away (brief §4.6). */
export async function notifyAdminsSafety(
  jobId: string,
  workerId: string,
  description: string,
) {
  const admin = createAdminClient();
  const [job, { data: worker }] = await Promise.all([
    jobFacts(jobId),
    admin
      .from("workers")
      .select("preferred_name, legal_first_name, legal_last_name")
      .eq("id", workerId)
      .single(),
  ]);
  if (!job) return;
  const name = worker
    ? `${worker.preferred_name ?? worker.legal_first_name ?? "A worker"} ${worker.legal_last_name ?? ""}`.trim()
    : "A worker";
  await notifyAdmins(
    "safety_report",
    {
      worker: name,
      work: job.category,
      site: job.site,
      business: job.business,
      description,
    },
    { url: "/admin/queues" },
  );
}

/**
 * Tells whoever posted a job that a booked worker hasn't clocked in (plan:
 * 30 minutes after the start, a setting).
 */
export async function notifyPossibleNoShow(jobId: string, workerId: string) {
  const admin = createAdminClient();
  const [job, { data: worker }] = await Promise.all([
    jobFacts(jobId),
    admin
      .from("workers")
      .select("preferred_name, legal_first_name, legal_last_name")
      .eq("id", workerId)
      .single(),
  ]);
  if (!job?.postedBy || !worker) return;
  const name =
    `${worker.preferred_name ?? worker.legal_first_name ?? "A worker"} ${worker.legal_last_name ?? ""}`.trim();
  await notify(
    "possible_no_show",
    job.postedBy,
    { worker: name, work: job.category, site: job.site },
    { url: `/business/jobs/${jobId}` },
  );
}
