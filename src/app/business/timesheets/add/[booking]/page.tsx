import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HoursForm } from "@/components/timesheets/hours-form";
import { formatDayShort, formatTime, sydneyDateKey } from "@/lib/format";
import { shiftHours } from "@/lib/job-format";
import { createClient } from "@/lib/supabase/server";
import { timeInputValue, type BusinessHours } from "@/lib/timesheets";

import { addTimesheet } from "../../actions";

export const metadata: Metadata = { title: "Add hours" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Hours for a booking with no timesheet, usually because the worker
 * didn't clock in. They're approved as entered, and the worker is told.
 */
export default async function AddHoursPage({
  params,
}: PageProps<"/business/timesheets/add/[booking]">) {
  const { booking } = await params;
  if (!UUID.test(booking)) notFound();
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("shifts(job_id)")
    .eq("id", booking)
    .maybeSingle();
  if (!assignment?.shifts) notFound();
  const { data } = await supabase.rpc("business_timesheets", {
    p_job_id: assignment.shifts.job_id,
    p_days: 3650,
  });
  const row = ((data ?? []) as BusinessHours[]).find(
    (r) => r.assignment_id === booking,
  );
  if (!row) notFound();
  if (row.timesheet_id) redirect(`/business/timesheets/${row.timesheet_id}`);
  const day = formatDayShort(row.shift_starts_at);

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/business/timesheets"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All timesheets
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Add {row.worker_name}&apos;s hours
        </h1>
        <p className="text-muted-foreground">
          {day}, {row.category_name} at {row.site_name}. Rostered{" "}
          {shiftHours({
            starts_at: row.shift_starts_at,
            ends_at: row.shift_ends_at,
          })}
          {row.shift_break_minutes
            ? ` with a ${row.shift_break_minutes}-minute break`
            : ""}
          .
        </p>
        {row.started_at ? (
          <p className="text-sm">
            {row.arrival_confirmed ? "Arrival confirmed" : "Clocked in"} at{" "}
            {formatTime(row.started_at)}, no clock-out yet.
          </p>
        ) : (
          <p className="text-sm">They didn&apos;t clock in.</p>
        )}
      </div>
      <section className="rounded-xl border bg-card p-5">
        <HoursForm
          action={addTimesheet.bind(
            null,
            booking,
            sydneyDateKey(row.shift_starts_at),
          )}
          idPrefix="add"
          day={day}
          defaults={{
            // Paid from the rostered start, or later if they came late.
            start: timeInputValue(
              row.started_at &&
                Date.parse(row.started_at) > Date.parse(row.shift_starts_at)
                ? row.started_at
                : row.shift_starts_at,
            ),
            finish: timeInputValue(row.shift_ends_at),
            breakMinutes: row.shift_break_minutes,
          }}
          note={{
            label: "A note for the worker",
            hint: "We text them the hours you enter.",
            required: false,
          }}
          submitLabel="Approve these hours"
          pendingText="Approving…"
        />
      </section>
    </div>
  );
}
