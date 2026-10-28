import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/forms/action-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  formatCalendarDate,
  formatCents,
  formatDateTime,
  sydneyDateKey,
} from "@/lib/format";
import { weekLabel } from "@/lib/pay-run-format";
import { adminInvoiceStatuses, invoiceStatus } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { workerName } from "@/lib/timesheet-format";

import { finishRun } from "../actions";

export const metadata: Metadata = { title: "Pay run" };

const KINDS = { hours: "Hours", cancellation: "Late cancellation" } as const;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-lg border bg-card p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

/** One week's run: its payroll file, invoices and lines. */
export default async function PayRunPage({
  params,
  searchParams,
}: PageProps<"/admin/pay-runs/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { ran } = await searchParams;
  const supabase = await createClient();
  const [{ data: run }, { data: invoices }, { data: lines }] =
    await Promise.all([
      supabase
        .from("pay_runs")
        .select(
          "id, period_start, period_end, created_at, line_count, pay_cents, bill_cents, gst_cents, profiles(full_name)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("invoices")
        .select(
          "id, number, status, due_on, total_cents, pdf_path, emailed_to, emailed_at, businesses(legal_name, trading_name, accounts_email)",
        )
        .eq("pay_run_id", id)
        .order("number"),
      supabase
        .from("pay_run_lines")
        .select(
          "id, kind, work_date, hours, pay_cents, bill_cents, site_name, workers(preferred_name, legal_first_name, legal_last_name), businesses(legal_name, trading_name)",
        )
        .eq("pay_run_id", id)
        .order("work_date"),
    ]);
  if (!run) notFound();
  const week = { start: run.period_start, end: run.period_end };
  const today = sydneyDateKey(new Date());
  const unfinished = (invoices ?? []).filter(
    (i) => !i.pdf_path || (!i.emailed_at && i.businesses?.accounts_email),
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Week of ${weekLabel(week)}`}
        description={`Run ${formatDateTime(run.created_at)}, ${run.profiles?.full_name ? `by ${run.profiles.full_name}` : "on schedule"}.`}
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/pay-runs/${run.id}/payroll`} download>
              <Download aria-hidden />
              Payroll file (CSV)
            </a>
          </Button>
        }
      />

      {ran ? (
        <Alert variant="success">
          <AlertDescription>
            Done. Each invoice has been emailed to the business&apos;s accounts
            email. Download the payroll file for the payroll provider&apos;s
            timesheet import.
          </AlertDescription>
        </Alert>
      ) : null}
      {unfinished > 0 ? (
        <Alert variant="warning">
          <AlertDescription className="space-y-3">
            <p>
              {unfinished === 1
                ? "1 invoice hasn't"
                : `${unfinished} invoices haven't`}{" "}
              been made or emailed yet. The weekly run tries again, or you can
              now.
            </p>
            <ActionButton
              action={finishRun.bind(null, run.id)}
              pendingText="Sending…"
              variant="outline"
            >
              Make and send them
            </ActionButton>
          </AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Lines" value={run.line_count} />
        <Fact label="Pay, before tax" value={formatCents(run.pay_cents)} />
        <Fact label="Billed, before GST" value={formatCents(run.bill_cents)} />
        <Fact
          label="Billed, with GST"
          value={formatCents(run.bill_cents + run.gst_cents)}
        />
      </dl>

      <section aria-labelledby="invoices" className="space-y-3">
        <h2 id="invoices" className="text-lg font-semibold">
          Invoices
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Business</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emailed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoices ?? []).map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {invoice.number}
                  </Link>
                </TableCell>
                <TableCell>
                  {invoice.businesses?.trading_name ||
                    invoice.businesses?.legal_name}
                </TableCell>
                <TableCell className="text-right">
                  {formatCents(invoice.total_cents)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={adminInvoiceStatuses[invoiceStatus(invoice, today)]}
                  />
                </TableCell>
                <TableCell className="[overflow-wrap:anywhere]">
                  {invoice.emailed_at
                    ? `${invoice.emailed_to}, ${formatDateTime(invoice.emailed_at)}`
                    : "Not yet"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="lines" className="space-y-3">
        <h2 id="lines" className="text-lg font-semibold">
          Lines
        </h2>
        <Table label="Lines in this run">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Business and site</TableHead>
              <TableHead>For</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Pay</TableHead>
              <TableHead className="text-right">Charge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(lines ?? []).map((line) => (
              <TableRow key={line.id}>
                <TableCell className="whitespace-nowrap">
                  {formatCalendarDate(line.work_date)}
                </TableCell>
                <TableCell>
                  {line.workers ? workerName(line.workers) : "Worker"}
                </TableCell>
                <TableCell>
                  {line.businesses?.trading_name || line.businesses?.legal_name}
                  , {line.site_name}
                </TableCell>
                <TableCell>{KINDS[line.kind]}</TableCell>
                <TableCell className="text-right">{line.hours}</TableCell>
                <TableCell className="text-right">
                  {formatCents(line.pay_cents)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCents(line.bill_cents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
