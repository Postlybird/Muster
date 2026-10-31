import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { JobSummary } from "@/components/jobs/job-summary";
import { StatusBadge } from "@/components/status/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  formatCents,
  formatDateTime,
  formatDayShort,
  formatTime,
  zoneOf,
} from "@/lib/format";
import { jobTitle, shiftHours, workersLabel } from "@/lib/job-format";
import { jobStatuses, shiftStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { loadJobDetails } from "@/server/jobs";
import { getAllSettings } from "@/server/settings";

import { repeatJob } from "../../post/actions";
import { makeCallout } from "./actions";
import { CancelWork } from "./cancel-work";
import { Applicants, Booked } from "./people";
import { SaveTemplateForm } from "./save-template-form";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({
  params,
  searchParams,
}: PageProps<"/business/jobs/[id]">) {
  const { id } = await params;
  const { posted } = await searchParams;
  const { business, role } = await getMyBusiness();
  if (!business) redirect("/business");
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, poster:profiles!jobs_posted_by_fkey(full_name)")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!job) notFound();
  if (job.status === "draft") redirect(`/business/post/${job.id}`);
  const urgent = job.type === "urgent";
  const [
    details,
    { data: template },
    { data: offeredTo },
    { data: openToAllAt },
    { data: booked },
    { data: reach },
    { count: waiting },
  ] = await Promise.all([
    loadJobDetails(job),
    supabase
      .from("job_templates")
      .select("name")
      .eq("job_id", job.id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase.rpc("job_offer_count", { p_job_id: job.id }),
    supabase.rpc("job_open_to_all_at", { p_job_id: job.id }),
    supabase
      .from("assignments")
      .select("shift_id, shifts!inner(job_id)")
      .eq("shifts.job_id", job.id)
      .eq("status", "confirmed"),
    // How many workers a call-out reached.
    urgent
      ? supabase.rpc("job_callout_reach", { p_job_id: job.id })
      : Promise.resolve({ data: null }),
    // Applicants still waiting to be picked.
    supabase
      .from("applications")
      .select("id, shifts!inner(job_id)", { count: "exact", head: true })
      .eq("shifts.job_id", job.id)
      .eq("status", "applied"),
  ]);
  const manager = canManage(role);
  const bookedOn = (shiftId: string) =>
    (booked ?? []).filter((row) => row.shift_id === shiftId).length;

  // Owners and managers can cancel shifts still to come (brief §4.5).
  const now = new Date();
  const toCome =
    manager && job.status === "posted"
      ? details.shifts.filter(
          (shift) =>
            (shift.status === "open" || shift.status === "filled") &&
            new Date(shift.starts_at) > now,
        )
      : [];
  const settings = toCome.length > 0 ? await getAllSettings() : null;
  // Open shifts still to come, which a call-out could fill.
  const stillOpen = details.shifts.filter(
    (shift) => shift.status === "open" && new Date(shift.starts_at) > now,
  );
  // Work starting within 48 hours that still needs people, with no one
  // waiting to be picked, can become a call-out (make_callout()).
  const canCallout =
    manager &&
    job.status === "posted" &&
    !urgent &&
    stillOpen.length > 0 &&
    (waiting ?? 0) === 0 &&
    stillOpen.every(
      (shift) =>
        new Date(shift.starts_at).getTime() - now.getTime() <= 48 * 3_600_000,
    );
  const describeCancel = (shifts: typeof toCome) => {
    const people = shifts.reduce((sum, shift) => sum + bookedOn(shift.id), 0);
    if (people === 0) return "No one's booked yet, so there's no charge.";
    const lateMs = (settings?.business_late_cancel_hours ?? 0) * 3_600_000;
    const late = shifts.some(
      (shift) =>
        bookedOn(shift.id) > 0 &&
        new Date(shift.starts_at).getTime() - now.getTime() < lateMs,
    );
    const told = `We'll tell the ${people === 1 ? "worker who's" : `${people} workers who are`} booked.`;
    return late
      ? `${told} It's less than ${settings?.business_late_cancel_hours} hours to the start, so each booking is charged ${settings?.business_late_cancel_charge_hours} hours at the shift's rate.`
      : told;
  };
  const title = jobTitle(details.categoryName, details.site?.name);
  const siteZone = zoneOf(details.site?.state);
  // Only while the business's favourites have their head start.
  const favouritesUntil =
    openToAllAt && new Date(openToAllAt) > new Date()
      ? new Date(openToAllAt)
      : null;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/business/jobs"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All jobs
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <StatusBadge status={jobStatuses[job.status]} />
        </div>
        <p className="text-sm text-muted-foreground">
          {job.posted_at
            ? `Posted ${formatDateTime(job.posted_at, siteZone)}`
            : null}
          {job.poster?.full_name ? ` by ${job.poster.full_name}` : null}
        </p>
      </div>

      {posted ? (
        <Alert variant="success">
          <AlertDescription>
            {urgent
              ? "Posted. We're telling every available, qualified worker nearby who takes call-outs, and the first to accept is booked. We'll email you when it's fully booked."
              : job.fill_mode === "auto"
                ? "Posted. Workers who match can see it now and are booked as they accept. We'll email you when it's fully booked."
                : "Posted. Workers who match can see it now. Applicants show below as they apply, and we'll email you when the first one does."}
          </AlertDescription>
        </Alert>
      ) : null}

      {urgent && job.status === "posted" ? (
        <section
          aria-labelledby="callout"
          className="space-y-2 rounded-xl border border-warning/30 bg-warning-soft p-5"
        >
          <h2 id="callout" className="text-lg font-semibold">
            Call-out
          </h2>
          {reach !== null ? (
            <p className="text-sm">
              {reach === 0
                ? "No one free and qualified who takes call-outs is nearby yet. We'll tell workers as they become available."
                : `Sent to ${workersLabel(reach)} by text and app notification. The first to accept is booked, and we'll tell you straight away.`}
            </p>
          ) : null}
          <p className="text-sm">
            {stillOpen.length === 0
              ? details.shifts.some((shift) => shift.status === "open")
                ? "It's past the start time, and no one took it."
                : "Filled. Who's coming is under Booked."
              : job.callout_alerted_at
                ? "No one has accepted yet, so our team is looking for someone too."
                : `Waiting for someone to accept. If no one has within ${settings?.callout_alert_minutes ?? 20} minutes, we'll tell you, and our team will look too.`}
          </p>
        </section>
      ) : null}

      {canCallout ? (
        <section
          aria-labelledby="need-someone"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="need-someone" className="text-lg font-semibold">
            Need someone fast?
          </h2>
          <p className="text-sm text-muted-foreground">
            Make it a call-out: we&apos;ll text every available, qualified
            worker nearby now, and the first to accept is booked. Call-outs cost{" "}
            {settings?.urgent_loading_pct.bill ?? 20}% more per hour.
          </p>
          <ConfirmAction
            trigger={<Button variant="outline">Make it a call-out</Button>}
            title="Make this a call-out?"
            description={`We'll text and notify every available, qualified worker nearby now, and the first to accept is booked. The open ${stillOpen.length === 1 ? "shift costs" : "shifts cost"} ${settings?.urgent_loading_pct.bill ?? 20}% more per hour; anyone already booked stays on their rate.`}
            confirmLabel="Make it a call-out"
            action={makeCallout.bind(null, job.id)}
            variant="default"
          />
        </section>
      ) : null}

      <section
        aria-labelledby="shifts"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <h2 id="shifts" className="text-lg font-semibold">
          Shifts
        </h2>
        {job.status === "posted" && !urgent && offeredTo !== null ? (
          <p className="text-sm">
            {offeredTo === 0
              ? "No workers match yet. We'll offer it to new workers as soon as they're verified."
              : `Offered to ${workersLabel(offeredTo)} who ${offeredTo === 1 ? "matches" : "match"}.`}
            {favouritesUntil
              ? ` Your favourites see it first, until ${formatTime(favouritesUntil, siteZone)}; then everyone who matches.`
              : ""}
          </p>
        ) : null}
        <ul className="divide-y">
          {details.shifts.map((shift) => (
            <li
              key={shift.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span>
                {formatDayShort(shift.starts_at, siteZone)},{" "}
                {shiftHours(shift, siteZone)}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">
                  {bookedOn(shift.id)} of {shift.headcount} booked
                </span>
                <StatusBadge status={shiftStatuses[shift.status]} />
                {toCome.some((s) => s.id === shift.id) ? (
                  <CancelWork
                    jobId={job.id}
                    shiftIds={[shift.id]}
                    trigger="Cancel"
                    title={`Cancel ${formatDayShort(shift.starts_at, siteZone)}?`}
                    description={describeCancel([shift])}
                    confirmLabel="Cancel this shift"
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {toCome.length > 1 ? (
          <CancelWork
            jobId={job.id}
            shiftIds={toCome.map((shift) => shift.id)}
            trigger="Cancel the whole job"
            title="Cancel the whole job?"
            description={`All ${toCome.length} shifts still to come. ${describeCancel(toCome)}`}
            confirmLabel="Cancel the job"
          />
        ) : null}
      </section>

      {job.status === "posted" && job.fill_mode === "pick" ? (
        <Applicants
          jobId={job.id}
          shifts={details.shifts}
          timeZone={siteZone}
          canPick={manager}
        />
      ) : null}

      <Booked
        jobId={job.id}
        shifts={details.shifts}
        timeZone={siteZone}
        now={now}
      />

      {job.estimate_cents !== null ? (
        <section
          aria-labelledby="cost"
          className="space-y-1 rounded-xl border bg-card p-5"
        >
          <h2 id="cost" className="text-lg font-semibold">
            Cost estimate
          </h2>
          <p className="text-sm">
            {formatCents(job.estimate_cents + (job.estimate_gst_cents ?? 0))}{" "}
            including GST, when posted. We invoice weekly for the hours actually
            worked.
            {job.callout_started_at
              ? ` Since it became a call-out, the open shifts cost ${settings?.urgent_loading_pct.bill ?? 20}% more per hour.`
              : ""}
          </p>
        </section>
      ) : null}

      <JobSummary job={job} details={details} listShifts={false} />

      {manager ? (
        <section
          aria-labelledby="again"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="again" className="text-lg font-semibold">
            Post it again
          </h2>
          <p className="text-sm text-muted-foreground">
            Copy everything except the dates
            {template
              ? `, or use the "${template.name}" template from Post work`
              : ""}
            .
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              action={repeatJob.bind(null, job.id)}
              variant="outline"
            >
              Post again
            </ActionButton>
          </div>
          {template ? null : <SaveTemplateForm jobId={job.id} />}
        </section>
      ) : null}
    </div>
  );
}
