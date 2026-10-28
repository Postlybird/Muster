import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { WhatsNext } from "@/components/status/whats-next";
import { HoursForm } from "@/components/timesheets/hours-form";
import { NoteForm } from "@/components/timesheets/note-form";
import { TimesheetDetails } from "@/components/timesheets/timesheet-details";
import { formatDateTime, formatDayShort, sydneyDateKey } from "@/lib/format";
import { businessTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { timeInputValue, type BusinessHours } from "@/lib/timesheets";

import {
  adjustTimesheet,
  approveTimesheet,
  disputeTimesheet,
  noteTimesheet,
} from "../actions";

export const metadata: Metadata = { title: "Timesheet" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Timesheet = BusinessHours & {
  timesheet_id: string;
  status: NonNullable<BusinessHours["status"]>;
  start_at: string;
  finish_at: string;
  break_minutes: number;
};

/** A summary that opens to show a form. */
function More({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary underline-offset-4 hover:underline">
        {summary}
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

/**
 * One worker's hours on one shift, for the business to approve, change or
 * query (brief §4.6).
 */
export default async function BusinessTimesheetPage({
  params,
}: PageProps<"/business/timesheets/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("timesheets")
    .select("job_id")
    .eq("id", id)
    .maybeSingle();
  if (!sheet) notFound();
  const { data } = await supabase.rpc("business_timesheets", {
    p_job_id: sheet.job_id,
    p_days: 3650,
  });
  const row = ((data ?? []) as BusinessHours[]).find(
    (r) => r.timesheet_id === id,
  ) as Timesheet | undefined;
  if (!row) notFound();
  const day = formatDayShort(row.shift_starts_at);
  const status = businessTimesheetStatuses[row.status];

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
          {row.worker_name}, {day}
        </h1>
        <p className="text-muted-foreground">
          {row.category_name} at {row.site_name}
        </p>
      </div>

      <WhatsNext
        title="These hours"
        status={status}
        detail={
          row.status === "submitted" && row.approve_by
            ? `Approve by ${formatDateTime(row.approve_by)}.`
            : null
        }
      />

      <section
        aria-labelledby="hours"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <h2 id="hours" className="text-lg font-semibold">
          Hours
        </h2>
        <TimesheetDetails
          timesheet={row}
          audience="business"
          arrivalConfirmed={row.arrival_confirmed}
          awayReasons={row.away_reasons}
          offline={row.offline}
          money={{ label: "Charge (excluding GST)", cents: row.bill_cents }}
        />
      </section>

      {row.status === "submitted" ? (
        <>
          <ActionButton
            action={approveTimesheet.bind(null, id)}
            pendingText="Approving…"
            size="lg"
            className="w-full sm:w-auto"
          >
            Approve these hours
          </ActionButton>
          <More summary="Change the hours">
            <HoursForm
              action={adjustTimesheet.bind(
                null,
                id,
                sydneyDateKey(row.shift_starts_at),
              )}
              idPrefix="change"
              day={day}
              defaults={{
                start: timeInputValue(row.start_at),
                finish: timeInputValue(row.finish_at),
                breakMinutes: row.break_minutes,
              }}
              note={{
                label: "What changed, for the worker",
                hint: "We text it to them with the new hours.",
                required: true,
              }}
              submitLabel="Save and approve"
            />
          </More>
          <More summary="Something's wrong? Query them with our team">
            <NoteForm
              action={disputeTimesheet.bind(null, id)}
              id="query"
              label="What's wrong with the hours?"
              hint="We'll look into it with you and the worker. The hours aren't charged until it's settled."
              submitLabel="Send to our team"
              variant="outline"
            />
          </More>
        </>
      ) : null}

      {row.status === "disputed" ? (
        <section
          aria-labelledby="your-side"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="your-side" className="text-lg font-semibold">
            Your side
          </h2>
          <NoteForm
            action={noteTimesheet.bind(null, id)}
            id="business-note"
            label="Anything our team should know"
            defaultValue={row.business_note}
            submitLabel="Save"
            pendingText="Saving…"
          />
        </section>
      ) : null}
    </div>
  );
}
