import type { Metadata } from "next";
import Link from "next/link";

import { FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addDays } from "@/domain/pay-runs";
import {
  customPeriod,
  durationLabel,
  percent,
  PERIOD_LABELS,
  periodOf,
  PERIODS,
  type Period,
} from "@/domain/reports";
import { requireAdmin } from "@/lib/auth";
import {
  formatCalendarDate,
  formatCents,
  formatHours,
  fromSydneyTime,
  sydneyDateKey,
} from "@/lib/format";
import { choiceParam, textParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports" };

type Line = {
  key: string;
  name: string;
  shifts: number;
  paid_minutes: number;
  bill_cents: number;
  cost_cents: number;
  margin_cents: number;
};

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold">{value}</dd>
      <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
    </div>
  );
}

function marginLabel(line: Pick<Line, "margin_cents" | "bill_cents">) {
  const share = percent(line.margin_cents, line.bill_cents);
  return share === null ? "—" : `${share}%`;
}

/** Hours and money for each business or work type, with totals. */
function MoneyTable({
  id,
  title,
  nameLabel,
  lines,
}: {
  id: string;
  title: string;
  nameLabel: string;
  lines: Line[];
}) {
  const total = lines.reduce(
    (sum, line) => ({
      shifts: sum.shifts + line.shifts,
      paid_minutes: sum.paid_minutes + line.paid_minutes,
      bill_cents: sum.bill_cents + line.bill_cents,
      cost_cents: sum.cost_cents + line.cost_cents,
      margin_cents: sum.margin_cents + line.margin_cents,
    }),
    {
      shifts: 0,
      paid_minutes: 0,
      bill_cents: 0,
      cost_cents: 0,
      margin_cents: 0,
    },
  );
  const number = "text-right tabular-nums whitespace-nowrap";
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approved hours in this period.
        </p>
      ) : (
        <Table label={`Hours and money ${title.toLowerCase()}`}>
          <TableHeader>
            <TableRow>
              <TableHead>{nameLabel}</TableHead>
              <TableHead className="text-right">Shifts</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Gross margin</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell className="font-medium">{line.name}</TableCell>
                <TableCell className={number}>{line.shifts}</TableCell>
                <TableCell className={number}>
                  {formatHours(line.paid_minutes)}
                </TableCell>
                <TableCell className={number}>
                  {formatCents(line.bill_cents)}
                </TableCell>
                <TableCell className={number}>
                  {formatCents(line.cost_cents)}
                </TableCell>
                <TableCell className={number}>
                  {formatCents(line.margin_cents)}
                </TableCell>
                <TableCell className={number}>{marginLabel(line)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className={number}>{total.shifts}</TableCell>
              <TableCell className={number}>
                {formatHours(total.paid_minutes)}
              </TableCell>
              <TableCell className={number}>
                {formatCents(total.bill_cents)}
              </TableCell>
              <TableCell className={number}>
                {formatCents(total.cost_cents)}
              </TableCell>
              <TableCell className={number}>
                {formatCents(total.margin_cents)}
              </TableCell>
              <TableCell className={number}>{marginLabel(total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </section>
  );
}

/**
 * How the business is going (brief §6): fill rate, time to fill, no-shows,
 * active workers, and hours, revenue and gross margin by work type and
 * business, for shifts starting in a period.
 */
export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  await requireAdmin();
  const params = await searchParams;
  const today = sydneyDateKey(new Date());
  const kind = choiceParam(params, "period", PERIODS);
  const from = textParam(params, "from");
  const to = textParam(params, "to");
  const custom = kind ? null : customPeriod(from, to);
  const badDates = !kind && (from !== "" || to !== "") && !custom;
  const period: Period =
    (kind ? periodOf(kind, today) : custom) ?? periodOf("last_30", today);

  const range = {
    p_from: fromSydneyTime(period.from, "00:00").toISOString(),
    p_to: fromSydneyTime(addDays(period.to, 1), "00:00").toISOString(),
  };
  const supabase = await createClient();
  const [summaryResult, breakdownResult] = await Promise.all([
    supabase.rpc("admin_report_summary", range).maybeSingle(),
    supabase.rpc("admin_report_breakdown", range),
  ]);
  if (summaryResult.error || breakdownResult.error) {
    throw new Error(
      `Couldn't build the report: ${(summaryResult.error ?? breakdownResult.error)?.message}`,
    );
  }
  const summary = summaryResult.data;
  const lines = (breakdownResult.data ?? []).map((row) => ({
    ...row,
    key: row.key ?? row.name,
    bill_cents: Number(row.bill_cents),
    cost_cents: Number(row.cost_cents),
    margin_cents: Number(row.margin_cents),
  }));
  const fill = percent(summary?.filled ?? 0, summary?.places ?? 0);
  const noShows = percent(
    summary?.no_shows ?? 0,
    summary?.started_bookings ?? 0,
  );
  const minutesToFill =
    summary?.median_minutes_to_fill === null ||
    summary?.median_minutes_to_fill === undefined
      ? null
      : Number(summary.median_minutes_to_fill);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="How filling work is going, and the hours and money behind it, for shifts starting in a period."
      />

      <div className="space-y-4">
        <nav aria-label="Periods" className="flex flex-wrap gap-2">
          {PERIODS.map((value) => (
            <Button
              key={value}
              asChild
              variant={value === kind ? "secondary" : "outline"}
            >
              <Link
                href={`/admin/reports?period=${value}`}
                aria-current={value === kind ? "page" : undefined}
              >
                {PERIOD_LABELS[value]}
              </Link>
            </Button>
          ))}
        </nav>
        <form
          key={`${period.from}:${period.to}`}
          action="/admin/reports"
          className="flex flex-wrap items-end gap-3"
        >
          <FormField id="from" label="From">
            {(field) => (
              <Input
                {...field}
                name="from"
                type="date"
                defaultValue={period.from}
                max={today}
                className="w-44"
              />
            )}
          </FormField>
          <FormField id="to" label="To">
            {(field) => (
              <Input
                {...field}
                name="to"
                type="date"
                defaultValue={period.to}
                className="w-44"
              />
            )}
          </FormField>
          <Button type="submit">Show report</Button>
        </form>
        {badDates ? (
          <Alert variant="warning">
            <AlertDescription>
              Choose a start date before the end date, at most a year apart.
              Showing the last 30 days instead.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <section aria-labelledby="summary" className="space-y-3">
        <h2 id="summary" className="text-lg font-semibold">
          Shifts from {formatCalendarDate(period.from)} to{" "}
          {formatCalendarDate(period.to)}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Fill rate"
            value={fill === null ? "—" : `${fill}%`}
            detail={
              summary?.places
                ? `${summary.filled} of ${summary.places} places booked`
                : "No shifts in this period"
            }
          />
          <StatTile
            label="Time to fill"
            value={minutesToFill === null ? "—" : durationLabel(minutesToFill)}
            detail="Typical time from posting to booking"
          />
          <StatTile
            label="No-show rate"
            value={noShows === null ? "—" : `${noShows}%`}
            detail={
              summary?.started_bookings
                ? `${summary.no_shows} of ${summary.started_bookings} bookings that started`
                : "No shifts have started yet"
            }
          />
          <StatTile
            label="Active workers"
            value={String(summary?.active_workers ?? 0)}
            detail={`${summary?.workers_worked ?? 0} worked in this period`}
          />
        </dl>
      </section>

      <MoneyTable
        id="by-category"
        title="By work type"
        nameLabel="Work type"
        lines={lines.filter((line) => line.dimension === "category")}
      />
      <MoneyTable
        id="by-business"
        title="By business"
        nameLabel="Business"
        lines={lines.filter((line) => line.dimension === "business")}
      />
      <p className="text-sm text-muted-foreground">
        Hours and money are from approved hours, before GST. Cost is pay plus
        on-costs (super, workers&apos; comp, payroll tax and insurance). Late
        cancellation charges are on invoices.
      </p>
    </div>
  );
}
