import { Banknote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents, formatDateTime } from "@/lib/format";
import { weekLabel } from "@/lib/pay-run-format";
import { createClient } from "@/lib/supabase/server";
import { previewPayRun } from "@/server/pay-runs";
import { getAllSettings } from "@/server/settings";

import { runPay } from "./actions";

export const metadata: Metadata = { title: "Pay runs" };

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-lg border bg-card p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

/**
 * The weekly pay and billing run (brief §4.8): the week due to be run,
 * with what it would pay and invoice, and the runs so far.
 */
export default async function PayRunsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [preview, settings, { data: runs }] = await Promise.all([
    previewPayRun(),
    getAllSettings(),
    supabase
      .from("pay_runs")
      .select(
        "id, period_start, period_end, created_at, line_count, pay_cents, bill_cents, gst_cents, profiles(full_name), invoices(status)",
      )
      .order("period_start", { ascending: false })
      .limit(52),
  ]);
  const plan = preview.plan;
  const businessIds = plan?.invoices.map((invoice) => invoice.business_id);
  const { data: businesses } = businessIds?.length
    ? await supabase
        .from("businesses")
        .select("id, legal_name, trading_name")
        .in("id", businessIds)
    : { data: [] };
  const businessName = new Map(
    (businesses ?? []).map((b) => [b.id, b.trading_name || b.legal_name]),
  );
  const runDay =
    settings.weekly_run_day[0]!.toUpperCase() +
    settings.weekly_run_day.slice(1);
  const workers = new Set(
    plan?.lines.filter((l) => l.pay_cents > 0).map((l) => l.worker_id),
  ).size;
  const notes = plan
    ? [
        plan.waiting > 0 &&
          `${plural(plan.waiting, "timesheet")} from this week or before ${plan.waiting === 1 ? "is" : "are"} still waiting for the business to approve. ${plan.waiting === 1 ? "It goes" : "They go"} in a later run.`,
        plan.queried > 0 && (
          <>
            {plural(plan.queried, "queried timesheet")}{" "}
            {plan.queried === 1 ? "is" : "are"} waiting for our team. Settle{" "}
            {plan.queried === 1 ? "it" : "them"} in{" "}
            <Link href="/admin/queues" className="underline underline-offset-4">
              Queues
            </Link>{" "}
            to include {plan.queried === 1 ? "it" : "them"}.
          </>
        ),
        plan.skipped > 0 &&
          `${plural(plan.skipped, "booking")} can't be worked out because ${plan.skipped === 1 ? "its" : "their"} rates are missing. ${plan.skipped === 1 ? "It's" : "They're"} left out.`,
        plan.missingPayrollIds.length > 0 &&
          `No payroll employee ID yet for ${plan.missingPayrollIds.join(", ")}. Add it before importing the payroll file.`,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pay runs"
        description={`Each week's payroll file and invoices. The ${runDay} run covers the Monday to Sunday before; once a week is over you can also run it here.`}
      />

      <section aria-labelledby="due" className="space-y-4">
        <h2 id="due" className="text-lg font-semibold">
          Week of {weekLabel(preview.week)}
        </h2>
        {preview.run ? (
          <Alert variant="success">
            <AlertDescription>
              This week has been run.{" "}
              <Link
                href={`/admin/pay-runs/${preview.run.id}`}
                className="font-medium underline underline-offset-4"
              >
                See the run
              </Link>
            </AlertDescription>
          </Alert>
        ) : preview.missingDetails.length > 0 ? (
          <Alert variant="warning">
            <AlertTitle>Our details are needed first</AlertTitle>
            <AlertDescription>
              <p>
                Every tax invoice shows them. Add{" "}
                {preview.missingDetails.join(", ")} under Pay and billing in{" "}
                <Link
                  href="/admin/settings"
                  className="underline underline-offset-4"
                >
                  Settings
                </Link>
                .
              </p>
            </AlertDescription>
          </Alert>
        ) : !plan || plan.lines.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Nothing to pay yet"
            description="No approved hours or late cancellations from this week or before are waiting to be paid."
          />
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact
                label="Lines"
                value={`${plan.lines.length} (${plural(workers, "worker")} paid)`}
              />
              <Fact
                label="Pay, before tax"
                value={formatCents(
                  plan.lines.reduce((sum, l) => sum + l.pay_cents, 0),
                )}
              />
              <Fact label="Invoices" value={plan.invoices.length} />
              <Fact
                label="Billed, with GST"
                value={formatCents(
                  plan.invoices.reduce((sum, i) => sum + i.total_cents, 0),
                )}
              />
            </dl>
            {notes.length > 0 ? (
              <Alert variant="info">
                <AlertTitle>Before you run it</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5">
                    {notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            <Table label="Invoices this run will raise">
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Before GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.invoices.map((invoice) => (
                  <TableRow key={invoice.business_id}>
                    <TableCell className="font-medium">
                      {businessName.get(invoice.business_id) ?? "Business"}
                    </TableCell>
                    <TableCell className="text-right">
                      {
                        plan.lines.filter(
                          (l) => l.business_id === invoice.business_id,
                        ).length
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(invoice.subtotal_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(invoice.total_cents)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatCalendarDate(invoice.due_on)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ConfirmAction
              trigger={<Button>Run pay and invoices</Button>}
              title={`Run the week of ${weekLabel(preview.week)}?`}
              description={`This saves ${plural(plan.lines.length, "line")} for payroll and raises ${plural(plan.invoices.length, "invoice")}, each emailed to the business's accounts email. The hours in it can't be changed afterwards.`}
              confirmLabel="Run it"
              variant="default"
              action={runPay}
            />
          </>
        )}
      </section>

      <section aria-labelledby="earlier" className="space-y-3">
        <h2 id="earlier" className="text-lg font-semibold">
          Runs so far
        </h2>
        {runs?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Run</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead className="text-right">Billed, with GST</TableHead>
                <TableHead>Invoices paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link
                      href={`/admin/pay-runs/${run.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {weekLabel({
                        start: run.period_start,
                        end: run.period_end,
                      })}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDateTime(run.created_at)},{" "}
                    {run.profiles?.full_name ?? "on schedule"}
                  </TableCell>
                  <TableCell className="text-right">{run.line_count}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(run.pay_cents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(run.bill_cents + run.gst_cents)}
                  </TableCell>
                  <TableCell>
                    {run.invoices.filter((i) => i.status === "paid").length} of{" "}
                    {run.invoices.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        )}
      </section>
    </div>
  );
}
