import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status/status-badge";
import { TimesheetDetails } from "@/components/timesheets/timesheet-details";
import { requireAdmin } from "@/lib/auth";
import {
  formatCents,
  formatDateTime,
  formatDayShort,
  formatTime,
  sydneyDateKey,
} from "@/lib/format";
import { businessTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { workerName } from "@/lib/timesheet-format";
import { timeInputValue } from "@/lib/timesheets";

import { resolveTimesheet } from "./actions";
import { ResolveForm } from "./resolve-form";

export const metadata: Metadata = { title: "Timesheet" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const KINDS: Record<string, string> = {
  clock_in: "Clocked in",
  clock_out: "Clocked out",
  arrival_confirmed: "Arrival confirmed by the business",
};

/**
 * A timesheet for admins: everything recorded, both sides' notes, the
 * cost, and (for a query) the form to settle it.
 */
export default async function AdminTimesheetPage({
  params,
}: PageProps<"/admin/timesheets/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("timesheets")
    .select(
      "*, workers(id, preferred_name, legal_first_name, legal_last_name), jobs(id, categories(name), sites(name), businesses(id, trading_name, legal_name)), assignments(shifts(starts_at, ends_at, break_minutes)), timesheet_costs(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!sheet?.assignments?.shifts) notFound();
  const { data: events } = await supabase
    .from("attendance_events")
    .select(
      "kind, occurred_at, received_at, distance_m, inside_geofence, reason, offline",
    )
    .eq("assignment_id", sheet.assignment_id)
    .order("occurred_at");
  const shift = sheet.assignments.shifts;
  const day = formatDayShort(shift.starts_at);
  const name = sheet.workers ? workerName(sheet.workers) : "Worker";
  const business =
    sheet.jobs?.businesses?.trading_name ?? sheet.jobs?.businesses?.legal_name;
  const cost = sheet.timesheet_costs;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/queues"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Queues
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {name}, {day}
          </h1>
          <StatusBadge status={businessTimesheetStatuses[sheet.status]} />
        </div>
        <p className="text-muted-foreground">
          {sheet.jobs?.categories?.name} for{" "}
          {sheet.jobs?.businesses ? (
            <Link
              href={`/admin/businesses/${sheet.jobs.businesses.id}`}
              className="underline underline-offset-4"
            >
              {business}
            </Link>
          ) : (
            business
          )}{" "}
          at {sheet.jobs?.sites?.name}.{" "}
          {sheet.workers ? (
            <Link
              href={`/admin/workers/${sheet.workers.id}`}
              className="underline underline-offset-4"
            >
              See the worker
            </Link>
          ) : null}
        </p>
      </div>

      <section
        aria-labelledby="hours"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <h2 id="hours" className="text-lg font-semibold">
          Hours
        </h2>
        <TimesheetDetails
          timesheet={{
            ...sheet,
            shift_starts_at: shift.starts_at,
            shift_ends_at: shift.ends_at,
            shift_break_minutes: shift.break_minutes,
          }}
          audience="admin"
          arrivalConfirmed={
            !(events ?? []).some((e) => e.kind === "clock_in") &&
            (events ?? []).some((e) => e.kind === "arrival_confirmed")
          }
        />
        {cost ? (
          <p className="text-sm text-muted-foreground">
            Pay {formatCents(cost.pay_cents)}, charge{" "}
            {formatCents(cost.bill_cents)} excluding GST, margin{" "}
            {formatCents(cost.margin_cents)} (worked out{" "}
            {formatDateTime(cost.costed_at)}
            {cost.start_at !== sheet.start_at ||
            cost.finish_at !== sheet.finish_at ||
            cost.break_minutes !== sheet.break_minutes
              ? ", before the hours changed"
              : ""}
            ).
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="attendance"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <h2 id="attendance" className="text-lg font-semibold">
          Clock-ins and outs
        </h2>
        {events?.length ? (
          <ul className="space-y-2 text-sm">
            {events.map((event) => (
              <li key={`${event.kind}-${event.occurred_at}`}>
                <span className="font-medium">
                  {KINDS[event.kind] ?? event.kind}{" "}
                  {formatTime(event.occurred_at)}
                </span>
                {event.inside_geofence === false
                  ? `, ${event.distance_m === null ? "no location" : `${event.distance_m} m from the site`}: "${event.reason ?? ""}"`
                  : event.inside_geofence
                    ? ", at the site"
                    : ""}
                {event.offline
                  ? ` (sent without signal at ${formatTime(event.received_at)})`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">None. The business entered these hours.</p>
        )}
      </section>

      {sheet.status === "disputed" ? (
        <section
          aria-labelledby="settle"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="settle" className="text-lg font-semibold">
            Settle the query
          </h2>
          <ResolveForm
            action={resolveTimesheet.bind(
              null,
              id,
              sydneyDateKey(shift.starts_at),
            )}
            day={day}
            defaults={{
              start: timeInputValue(sheet.start_at),
              finish: timeInputValue(sheet.finish_at),
              breakMinutes: sheet.break_minutes,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
