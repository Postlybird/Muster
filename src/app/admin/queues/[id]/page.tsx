import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Detail, Section } from "@/components/admin/detail-section";
import { DocumentView } from "@/components/admin/document-view";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FLAG_KINDS, outcomesFor } from "@/lib/admin-flags";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatTime } from "@/lib/format";
import { shiftSummary } from "@/lib/job-format";
import { workerStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { workerName } from "@/lib/timesheet-format";
import { logAccess } from "@/server/audit";

import { removeFromShift, settleFlag } from "./actions";
import { SettleForm } from "./settle-form";

export const metadata: Metadata = { title: "Matter to settle" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ATTENDANCE: Record<string, string> = {
  clock_in: "Clocked in",
  clock_out: "Clocked out",
  arrival_confirmed: "Arrival confirmed",
};

/** One matter in the queues: what happened, and settling it (brief §6). */
export default async function FlagPage({
  params,
}: PageProps<"/admin/queues/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: flag } = await supabase
    .from("admin_flags")
    .select(
      "id, kind, summary, status, resolution, resolved_at, created_at, worker_id, assignment_id, resolver:profiles!admin_flags_resolved_by_fkey(full_name, email), workers(id, profile_id, preferred_name, legal_first_name, legal_last_name, status, status_reason), businesses(id, trading_name, legal_name), assignments(id, status, shifts(starts_at, ends_at, jobs(categories(name), sites(name, suburb))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!flag) notFound();
  if (flag.kind === "timesheet_dispute" && flag.assignment_id) {
    const { data: sheet } = await supabase
      .from("timesheets")
      .select("id")
      .eq("assignment_id", flag.assignment_id)
      .maybeSingle();
    if (sheet) redirect(`/admin/timesheets/${sheet.id}`);
  }

  const shift = flag.assignments?.shifts ?? null;
  const worker = flag.workers;
  const [{ data: attendance }, { data: reports }, { data: bookings }] =
    await Promise.all([
      flag.assignment_id && flag.kind.includes("no_show")
        ? supabase
            .from("attendance_events")
            .select("id, kind, occurred_at")
            .eq("assignment_id", flag.assignment_id)
            .order("occurred_at")
        : Promise.resolve({ data: null }),
      flag.assignment_id && flag.kind === "safety"
        ? supabase
            .from("safety_reports")
            .select("id, description, photo_paths, created_at, status")
            .eq("assignment_id", flag.assignment_id)
            .order("created_at")
        : Promise.resolve({ data: null }),
      flag.worker_id && flag.kind === "suspension" && flag.status === "open"
        ? supabase
            .from("assignments")
            .select(
              "id, shifts!inner(starts_at, ends_at, jobs(categories(name), sites(suburb), businesses(trading_name, legal_name)))",
            )
            .eq("worker_id", flag.worker_id)
            .eq("status", "confirmed")
            .gt("shifts.starts_at", new Date().toISOString())
            .order("starts_at", { referencedTable: "shifts" })
        : Promise.resolve({ data: null }),
    ]);

  // Safety photos are the worker's, so viewing them is logged (brief §4.9).
  const photos: { url: string | null; label: string }[] = [];
  for (const report of reports ?? []) {
    if (report.photo_paths.length === 0) continue;
    const { data: signed } = await supabase.storage
      .from("safety-photos")
      .createSignedUrls(report.photo_paths, 300);
    for (const photo of signed ?? []) {
      photos.push({
        url: photo.signedUrl,
        label: `Photo ${photos.length + 1}`,
      });
    }
    await logAccess(
      "view_safety_photos",
      "safety_reports",
      report.id,
      worker?.profile_id ?? null,
    );
  }

  const open = flag.status === "open";
  const resolver = flag.resolver as unknown as {
    full_name: string | null;
    email: string | null;
  } | null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href="/admin/queues">
          <ArrowLeft aria-hidden />
          Queues
        </Link>
      </Button>
      <PageHeader
        title={FLAG_KINDS[flag.kind] ?? flag.kind}
        description={flag.summary}
      />

      <Section
        id="details"
        title="What happened"
        badge={
          <Badge variant={open ? "warning" : "success"}>
            {open ? "Open" : "Settled"}
          </Badge>
        }
      >
        <dl className="space-y-2">
          <Detail label="Raised" value={formatDateTime(flag.created_at)} />
          {worker ? (
            <Detail
              label="Worker"
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/workers/${worker.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {workerName(worker)}
                  </Link>
                  <StatusBadge status={workerStatuses[worker.status]} />
                </span>
              }
            />
          ) : null}
          {flag.businesses ? (
            <Detail
              label="Business"
              value={
                <Link
                  href={`/admin/businesses/${flag.businesses.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {flag.businesses.trading_name ?? flag.businesses.legal_name}
                </Link>
              }
            />
          ) : null}
          {shift ? (
            <Detail
              label="Shift"
              value={`${shift.jobs?.categories?.name ?? "Work"} at ${shift.jobs?.sites?.name ?? "the site"}, ${shift.jobs?.sites?.suburb ?? ""}: ${shiftSummary([shift])}`}
            />
          ) : null}
          {attendance ? (
            <Detail
              label="On the day"
              value={
                attendance.length > 0
                  ? attendance
                      .map(
                        (event) =>
                          `${ATTENDANCE[event.kind] ?? event.kind} at ${formatTime(event.occurred_at)}`,
                      )
                      .join(", ")
                  : "No clock-in or confirmed arrival"
              }
            />
          ) : null}
          {flag.kind === "suspension" && worker?.status_reason ? (
            <Detail label="Why" value={worker.status_reason} />
          ) : null}
        </dl>
      </Section>

      {reports && reports.length > 0 ? (
        <Section id="report" title="The report">
          {reports.map((report) => (
            <blockquote
              key={report.id}
              className="border-l-4 pl-4 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap"
            >
              {report.description}
              <footer className="mt-1 text-xs text-muted-foreground">
                Reported {formatDateTime(report.created_at)}
              </footer>
            </blockquote>
          ))}
          {photos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {photos.map((photo) => (
                <DocumentView
                  key={photo.label}
                  url={photo.url}
                  label={photo.label}
                />
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {bookings ? (
        <Section id="bookings" title="Their booked shifts">
          <p className="text-sm text-muted-foreground">
            On hold, they can&apos;t take new shifts. Decide whether they keep
            these. Taking them off offers the shift to other workers.
          </p>
          {bookings.length > 0 ? (
            <ul className="divide-y">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="text-sm">
                    <span className="block font-medium">
                      {booking.shifts.jobs?.categories?.name ?? "Work"} for{" "}
                      {booking.shifts.jobs?.businesses?.trading_name ??
                        booking.shifts.jobs?.businesses?.legal_name}
                      , {booking.shifts.jobs?.sites?.suburb}
                    </span>
                    {shiftSummary([booking.shifts])}
                  </span>
                  <ConfirmAction
                    trigger={
                      <Button variant="outline">Take off this shift</Button>
                    }
                    title="Take them off this shift?"
                    description="We tell them their account is on hold, tell the business, and offer the shift to other workers."
                    confirmLabel="Take off"
                    action={removeFromShift.bind(null, flag.id, booking.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No shifts booked.</p>
          )}
        </Section>
      ) : null}

      <Section id="settle" title={open ? "Settle it" : "How it was settled"}>
        {open ? (
          <SettleForm
            action={settleFlag.bind(null, flag.id)}
            choices={outcomesFor(flag.kind)}
          />
        ) : (
          <dl className="space-y-2">
            <Detail label="Decision" value={flag.resolution} />
            <Detail
              label="Settled"
              value={
                flag.resolved_at
                  ? `${formatDateTime(flag.resolved_at)}${resolver ? ` by ${resolver.full_name ?? resolver.email}` : " automatically"}`
                  : null
              }
            />
          </dl>
        )}
      </Section>
    </div>
  );
}
