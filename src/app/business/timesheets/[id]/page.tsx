import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { RatingForm } from "@/components/ratings/rating-form";
import { WhatsNext } from "@/components/status/whats-next";
import { HoursForm } from "@/components/timesheets/hours-form";
import { NoteForm } from "@/components/timesheets/note-form";
import { TimesheetDetails } from "@/components/timesheets/timesheet-details";
import { WORKER_TAGS } from "@/domain/ratings";
import { isPayable } from "@/domain/timesheets";
import { formatDateTime, formatDayShort, sydneyDateKey } from "@/lib/format";
import { ratingGiven } from "@/lib/rating-format";
import { businessTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { timeInputValue, type BusinessHours } from "@/lib/timesheets";
import { canManage, getMyBusiness } from "@/server/businesses";

import {
  adjustTimesheet,
  approveTimesheet,
  disputeTimesheet,
  noteTimesheet,
  rateWorker,
} from "../actions";
import { NextTimeField } from "./next-time-field";

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
  // Once the hours are approved, the business rates the worker (brief §4.7).
  const { business, role } = await getMyBusiness();
  const manager = canManage(role);
  const [{ data: rating }, { data: favourite }] = isPayable(row.status)
    ? await Promise.all([
        supabase
          .from("ratings")
          .select("score, tags")
          .eq("assignment_id", row.assignment_id)
          .eq("direction", "worker")
          .maybeSingle(),
        manager && business
          ? supabase
              .from("favourites")
              .select("worker_id")
              .eq("business_id", business.id)
              .eq("worker_id", row.worker_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];
  const firstName = row.worker_name.split(" ")[0] ?? row.worker_name;

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

      {isPayable(row.status) ? (
        <section
          aria-labelledby="rate"
          className="space-y-3 rounded-xl border bg-card p-5"
        >
          <h2 id="rate" className="text-lg font-semibold">
            {rating ? `Your rating for ${firstName}` : `Rate ${firstName}`}
          </h2>
          {rating ? (
            <p className="text-sm">{ratingGiven(rating, "worker")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Other businesses see the average, not what you say. Any comments
                go only to our team.
              </p>
              <RatingForm
                action={rateWorker.bind(
                  null,
                  row.assignment_id,
                  row.worker_id,
                  id,
                )}
                idPrefix="rate-worker"
                starsLegend={`How did ${firstName} go?`}
                tags={WORKER_TAGS}
              >
                {manager ? <NextTimeField favourite={!!favourite} /> : null}
              </RatingForm>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
