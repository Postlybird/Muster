import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RatingForm } from "@/components/ratings/rating-form";
import { WhatsNext } from "@/components/status/whats-next";
import { NoteForm } from "@/components/timesheets/note-form";
import { TimesheetDetails } from "@/components/timesheets/timesheet-details";
import { SITE_TAGS } from "@/domain/ratings";
import { isPayable } from "@/domain/timesheets";
import { formatDateTime, formatDayShort } from "@/lib/format";
import { ratingGiven } from "@/lib/rating-format";
import { workerTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import type { WorkerTimesheet } from "@/lib/timesheets";

import { disputeTimesheet, noteTimesheet, rateSite } from "../actions";

export const metadata: Metadata = { title: "Timesheet" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * One shift's hours, from the worker's side: what was recorded, what's
 * being paid, and a way to add a note or query them (brief §4.6).
 */
export default async function WorkerTimesheetPage({
  params,
}: PageProps<"/worker/timesheets/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("my_timesheets", { p_id: id })
    .maybeSingle();
  const sheet = data as WorkerTimesheet | null;
  if (!sheet) notFound();
  // Once the hours are approved, the worker rates the site (brief §4.7).
  const { data: booking } = isPayable(sheet.status)
    ? await supabase
        .from("timesheets")
        .select("assignment_id")
        .eq("id", id)
        .single()
    : { data: null };
  const { data: rating } = booking
    ? await supabase
        .from("ratings")
        .select("score, tags")
        .eq("assignment_id", booking.assignment_id)
        .eq("direction", "site")
        .maybeSingle()
    : { data: null };
  const status = workerTimesheetStatuses[sheet.status];
  const canQuery =
    ["approved", "auto_approved", "adjusted"].includes(sheet.status) &&
    !sheet.resolved_at;

  return (
    <div className="space-y-4">
      <Link
        href="/worker/timesheets"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Timesheets
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {formatDayShort(sheet.shift_starts_at)}
        </h1>
        <p className="text-muted-foreground">
          {sheet.category_name} for {sheet.business_name} at {sheet.site_name}
        </p>
      </div>

      <WhatsNext
        title="Your hours"
        status={status}
        detail={
          sheet.status === "submitted"
            ? `If the business hasn't checked them by ${formatDateTime(sheet.approve_by)}, they're approved as they are.`
            : null
        }
      />

      <section
        aria-labelledby="hours"
        className="space-y-3 rounded-xl border bg-card p-4"
      >
        <h2 id="hours" className="font-semibold">
          Hours
        </h2>
        <TimesheetDetails
          timesheet={sheet}
          audience="worker"
          money={{ label: "Your pay (before tax)", cents: sheet.pay_cents }}
        />
      </section>

      {sheet.status === "submitted" || sheet.status === "disputed" ? (
        <section
          aria-labelledby="note"
          className="space-y-3 rounded-xl border bg-card p-4"
        >
          <h2 id="note" className="font-semibold">
            {sheet.status === "submitted"
              ? "A note for the business"
              : "Your side"}
          </h2>
          <NoteForm
            action={noteTimesheet.bind(null, id)}
            id="worker-note"
            label={
              sheet.status === "submitted"
                ? "Anything they should know about these hours"
                : "Anything our team should know"
            }
            hint={
              sheet.status === "submitted"
                ? "For example, if you forgot to clock out, when you finished."
                : undefined
            }
            defaultValue={sheet.worker_note}
            submitLabel="Save note"
            pendingText="Saving…"
          />
        </section>
      ) : null}

      {booking ? (
        <section
          aria-labelledby="rate"
          className="space-y-3 rounded-xl border bg-card p-4"
        >
          <h2 id="rate" className="font-semibold">
            {rating ? "Your rating for the site" : "Rate the site"}
          </h2>
          {rating ? (
            <p className="text-sm">{ratingGiven(rating, "site")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Other workers see {sheet.business_name}&apos;s average, not what
                you say. Any comments go only to our team.
              </p>
              <RatingForm
                action={rateSite.bind(null, booking.assignment_id, id)}
                idPrefix="rate-site"
                starsLegend={`How was ${sheet.site_name}?`}
                tags={SITE_TAGS}
              />
            </>
          )}
        </section>
      ) : null}

      {canQuery ? (
        <section
          aria-labelledby="query"
          className="space-y-3 rounded-xl border bg-card p-4"
        >
          <h2 id="query" className="font-semibold">
            Something not right?
          </h2>
          <NoteForm
            action={disputeTimesheet.bind(null, id)}
            id="worker-query"
            label="What's wrong with these hours?"
            hint="Our team will look into it with the business and let you know."
            submitLabel="Query these hours"
            variant="outline"
          />
        </section>
      ) : null}
    </div>
  );
}
