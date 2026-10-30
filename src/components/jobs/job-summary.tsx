import Link from "next/link";

import { FILL_MODES, JOB_TYPES, PPE_SUPPLIERS } from "@/domain/jobs";
import { formatDayShort, zoneOf } from "@/lib/format";
import { shiftHours, shiftSummary, workersLabel } from "@/lib/job-format";
import { formatAuPhone } from "@/lib/phone";
import type { Tables } from "@/lib/supabase/database.types";
import type { JobDetails } from "@/server/jobs";

type Step = "what" | "when" | "needs" | "safety";

function Section({
  id,
  title,
  changeHref,
  children,
}: {
  id: string;
  title: string;
  changeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-xl border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {changeHref ? (
          <Link
            href={changeHref}
            className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            Change<span className="sr-only">: {title}</span>
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere] whitespace-pre-line">
        {children}
      </dd>
    </div>
  );
}

/**
 * What a job asks for: the work, when, tickets and instructions, safety.
 * With `changeHref`, each section links back to its post-work step.
 */
export function JobSummary({
  job,
  details,
  changeHref,
  listShifts = true,
}: {
  job: Tables<"jobs">;
  details: JobDetails;
  changeHref?: (step: Step) => string;
  /** Off where the page lists the shifts already. */
  listShifts?: boolean;
}) {
  const { site, shifts } = details;
  // Shift times are the site's local time.
  const siteZone = zoneOf(site?.state);
  return (
    <div className="space-y-4">
      <Section
        id="summary-what"
        title="The work"
        changeHref={changeHref?.("what")}
      >
        <dl className="space-y-2">
          <Detail label="Kind">{JOB_TYPES[job.type].label}</Detail>
          <Detail label="Type of work">{details.categoryName ?? "—"}</Detail>
          <Detail label="Site">
            {site
              ? `${site.name}, ${site.address_line1}, ${site.suburb} ${site.state} ${site.postcode}`
              : "—"}
          </Detail>
          <Detail label="Workers">{workersLabel(job.headcount)}</Detail>
          {job.status !== "draft" ? (
            <Detail label="Filling">{FILL_MODES[job.fill_mode].label}</Detail>
          ) : null}
        </dl>
      </Section>

      <Section id="summary-when" title="When" changeHref={changeHref?.("when")}>
        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dates yet.</p>
        ) : (
          <>
            <p className="text-sm">
              {shiftSummary(shifts, siteZone)}
              {shifts[0]?.break_minutes
                ? `, with a ${shifts[0].break_minutes}-minute unpaid break`
                : ", no break"}
            </p>
            {listShifts && shifts.length > 1 ? (
              <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {shifts.map((shift) => (
                  <li key={shift.id}>
                    {formatDayShort(shift.starts_at, siteZone)},{" "}
                    {shiftHours(shift, siteZone)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </Section>

      <Section
        id="summary-needs"
        title="Tickets and instructions"
        changeHref={changeHref?.("needs")}
      >
        <dl className="space-y-2">
          <Detail label="Tickets">
            {details.tickets.length > 0 ? details.tickets.join(", ") : "None"}
          </Detail>
          <Detail label="Police check">
            {job.police_check_required ? "Needed" : "Not needed"}
          </Detail>
          <Detail label="Instructions">{job.instructions || "None"}</Detail>
          <Detail label="Report to">
            {job.report_to_name
              ? `${job.report_to_name}${job.report_to_phone ? `, ${formatAuPhone(job.report_to_phone)}` : ""}`
              : "—"}
          </Detail>
        </dl>
        {details.photoUrls.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {details.photoUrls.map((url, index) => (
              <li key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                <img
                  src={url}
                  alt={`Job photo ${index + 1}`}
                  className="size-24 rounded-md object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        id="summary-safety"
        title="Safety"
        changeHref={changeHref?.("safety")}
      >
        <dl className="space-y-2">
          <Detail label="Hazards">
            {job.no_known_hazards
              ? "No known hazards"
              : details.hazards.length > 0
                ? details.hazards.join(", ")
                : "Not answered yet"}
          </Detail>
          {job.hazard_controls ? (
            <Detail label="Controls">{job.hazard_controls}</Detail>
          ) : null}
          {job.hazard_notes ? (
            <Detail label="Notes">{job.hazard_notes}</Detail>
          ) : null}
          {job.induction ? (
            <Detail label="Induction">{job.induction}</Detail>
          ) : null}
          <Detail label="PPE">
            {details.ppe.length > 0 ? details.ppe.join(", ") : "None"}
          </Detail>
          <Detail label="Supplied by">
            {PPE_SUPPLIERS[job.ppe_supplied_by]}
          </Detail>
          {job.ppe_notes ? (
            <Detail label="PPE notes">{job.ppe_notes}</Detail>
          ) : null}
        </dl>
      </Section>
    </div>
  );
}
