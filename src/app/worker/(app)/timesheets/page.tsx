import { Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { formatCents, formatDayShort, zoneOf } from "@/lib/format";
import { workerTimesheetStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { hoursLabel, workedLabel } from "@/lib/timesheet-format";
import type { WorkerTimesheet } from "@/lib/timesheets";

export const metadata: Metadata = { title: "Timesheets" };

/** A worker's hours, newest first, with where each is up to (brief §4.6). */
export default async function WorkerTimesheetsPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_timesheets", {});
  const timesheets = (data ?? []) as WorkerTimesheet[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description="Your hours after each shift. The business approves them, then they're paid in the weekly pay run."
      />
      {timesheets.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="No hours yet"
          description="When you clock out of a shift, your hours show here."
        />
      ) : (
        <ul className="space-y-3">
          {timesheets.map((sheet) => (
            <li key={sheet.timesheet_id}>
              <Link
                href={`/worker/timesheets/${sheet.timesheet_id}`}
                className="block space-y-1 rounded-xl border bg-card p-4 hover:bg-muted/50"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {formatDayShort(sheet.shift_starts_at, zoneOf(sheet.state))}
                  </span>
                  <StatusBadge status={workerTimesheetStatuses[sheet.status]} />
                </span>
                <span className="block text-sm">
                  {sheet.category_name} for {sheet.business_name}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {hoursLabel(sheet, zoneOf(sheet.state))} ({workedLabel(sheet)}
                  )
                </span>
                {sheet.pay_cents !== null ? (
                  <span className="block text-sm font-medium">
                    {formatCents(sheet.pay_cents)} before tax
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
