import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { isLateArrival } from "@/domain/timesheets";
import {
  formatCents,
  formatDateTime,
  formatDayShort,
  formatTime,
  zoneOf,
} from "@/lib/format";
import { shiftHours } from "@/lib/job-format";
import { businessTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { hoursLabel, workedLabel } from "@/lib/timesheet-format";
import { groupBusinessHours, type BusinessHours } from "@/lib/timesheets";
import { getMyBusiness } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

import { reportNoShow } from "../jobs/[id]/actions";
import { ApproveForm, type HoursToApprove } from "./approve-form";

export const metadata: Metadata = { title: "Timesheets" };

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function where(row: BusinessHours) {
  return `${row.category_name} at ${row.site_name}`;
}

function rostered(row: BusinessHours) {
  return `Rostered ${shiftHours({ starts_at: row.shift_starts_at, ends_at: row.shift_ends_at }, zoneOf(row.state))}`;
}

type Timesheet = BusinessHours & {
  timesheet_id: string;
  start_at: string;
  finish_at: string;
  break_minutes: number;
};

function hours(row: Timesheet) {
  return `${hoursLabel(row, zoneOf(row.state))} (${workedLabel(row)})`;
}

/** Things worth a second look before approving. */
function flags(row: Timesheet, graceMinutes: number): string[] {
  const found: string[] = [];
  if (row.recorded_finish === null) found.push("No clock-out");
  if (
    isLateArrival(
      new Date(row.start_at),
      new Date(row.shift_starts_at),
      graceMinutes,
    )
  ) {
    found.push("Started late");
  }
  if (row.away_reasons.length > 0) found.push("Away from the site");
  if (row.offline) found.push("Sent without signal");
  return found;
}

/**
 * The business's timesheets (brief §4.6, §7): hours to approve, all at
 * once or one by one; bookings with no hours yet; queries with our team;
 * and what's been approved.
 */
export default async function BusinessTimesheetsPage() {
  const { business } = await getMyBusiness();
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    business
      ? supabase.rpc("business_timesheets", {})
      : Promise.resolve({ data: [] }),
    getAllSettings(),
  ]);
  const rows = (data ?? []) as BusinessHours[];
  const { toApprove, missing, queried, done } = groupBusinessHours(
    rows,
    new Date(),
  );
  // Approved hours waiting for the business to rate the worker (brief §4.7).
  const { data: rated } = done.length
    ? await supabase
        .from("ratings")
        .select("assignment_id")
        .eq("direction", "worker")
        .in(
          "assignment_id",
          done.map((row) => row.assignment_id),
        )
    : { data: [] };
  const unrated = new Set(
    done
      .filter(
        (row) =>
          row.status !== "rejected" &&
          !(rated ?? []).some((r) => r.assignment_id === row.assignment_id),
      )
      .map((row) => row.assignment_id),
  );
  const items: HoursToApprove[] = (toApprove as Timesheet[]).map((row) => ({
    id: row.timesheet_id,
    name: row.worker_name,
    day: formatDayShort(row.shift_starts_at, zoneOf(row.state)),
    where: where(row),
    hours: hours(row),
    rostered: rostered(row),
    flags: flags(row, settings.late_arrival_grace_minutes),
    workerNote: row.worker_note,
    approveBy: formatDateTime(row.approve_by!, zoneOf(row.state)),
  }));

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Timesheets"
        description={`Check and approve your workers' hours. Hours nobody approves or queries within ${settings.auto_approve_hours} hours are approved as they are.`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No hours yet"
          description="When your workers clock out, their hours come here for you to approve."
        />
      ) : null}

      {items.length > 0 ? (
        <Section
          id="to-approve"
          title="To approve"
          description="All ticked. Untick any you want to check first, or open one to change the hours or query them with our team."
        >
          {/* A fresh form whenever the hours waiting change. */}
          <ApproveForm
            key={items.map((item) => item.id).join()}
            items={items}
          />
        </Section>
      ) : null}

      {missing.length > 0 ? (
        <Section
          id="missing"
          title="No hours yet"
          description="These shifts are over but we don't have the hours."
        >
          <ul className="divide-y rounded-lg border bg-card">
            {missing.map((row) => {
              const day = formatDayShort(
                row.shift_starts_at,
                zoneOf(row.state),
              );
              return (
                <li key={row.assignment_id} className="space-y-2 p-4">
                  <p className="font-medium">
                    {row.worker_name}, {day}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {rostered(row)} · {where(row)}
                  </p>
                  <p className="text-sm">
                    {row.started_at
                      ? `${row.arrival_confirmed ? "Arrival confirmed" : "Clocked in"} at ${formatTime(row.started_at, zoneOf(row.state))}, but no clock-out yet. An hour after the shift we'll use the rostered finish.`
                      : "No clock-in. If they worked, add their hours."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/business/timesheets/add/${row.assignment_id}`}
                        aria-label={`Add ${row.worker_name}'s hours for ${day}`}
                      >
                        Add their hours
                      </Link>
                    </Button>
                    {row.started_at ? null : (
                      <ConfirmAction
                        trigger={
                          <Button variant="outline" size="sm">
                            Didn&apos;t turn up {day}
                          </Button>
                        }
                        title={`Report ${row.worker_name} as a no-show?`}
                        description={`For ${day}. It counts against their reliability, and repeated no-shows put their account on hold. We'll let them know.`}
                        confirmLabel="Report no-show"
                        action={reportNoShow.bind(
                          null,
                          row.job_id,
                          row.assignment_id,
                          row.worker_id,
                        )}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {queried.length > 0 ? (
        <Section
          id="queried"
          title="With our team"
          description="We're looking into these hours and will let you both know."
        >
          <HoursList rows={queried as Timesheet[]} />
        </Section>
      ) : null}

      {done.length > 0 ? (
        <Section
          id="done"
          title="Approved"
          description="The last eight weeks. Charges exclude GST."
        >
          <HoursList rows={done as Timesheet[]} showCharge unrated={unrated} />
        </Section>
      ) : null}
    </div>
  );
}

function HoursList({
  rows,
  showCharge = false,
  unrated,
}: {
  rows: Timesheet[];
  showCharge?: boolean;
  /** Bookings whose worker the business hasn't rated yet. */
  unrated?: Set<string>;
}) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {rows.map((row) => (
        <li key={row.timesheet_id}>
          <Link
            href={`/business/timesheets/${row.timesheet_id}`}
            className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-muted/50"
          >
            <span className="space-y-1">
              <span className="block font-medium">
                {row.worker_name},{" "}
                {formatDayShort(row.shift_starts_at, zoneOf(row.state))}
              </span>
              <span className="block text-sm">{hours(row)}</span>
              <span className="block text-sm text-muted-foreground">
                {where(row)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1 text-sm">
              <StatusBadge status={businessTimesheetStatuses[row.status!]} />
              {showCharge && row.bill_cents !== null ? (
                <span>{formatCents(row.bill_cents)}</span>
              ) : null}
              {unrated?.has(row.assignment_id) ? (
                <span className="font-medium text-primary">Rate them</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
