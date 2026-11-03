import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/reports/stat-tile";
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
import { customPeriod } from "@/domain/reports";
import {
  SALES_PERIOD_LABELS,
  SALES_PERIODS,
  salesPeriodOf,
  salesTotals,
  type SalesAmounts,
  type SalesLine,
} from "@/domain/sales";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { SALES_KIND_LABELS, salesNote } from "@/lib/sales-csv";
import { choiceParam, textParam } from "@/lib/search-params";
import { loadSalesLines } from "@/server/sales";

export const metadata: Metadata = { title: "Sales and GST" };

const number = "text-right tabular-nums whitespace-nowrap";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Lines with their amounts, and the total of them in the footer. */
function SalesTable({
  label,
  lines,
  total,
  dateLabel,
  noteLabel,
}: {
  label: string;
  lines: SalesLine[];
  total: Omit<SalesAmounts, "count">;
  dateLabel: string;
  noteLabel: string;
}) {
  return (
    <Table label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>{dateLabel}</TableHead>
          <TableHead>Number</TableHead>
          <TableHead>Business</TableHead>
          <TableHead className="text-right">Excluding GST</TableHead>
          <TableHead className="text-right">GST</TableHead>
          <TableHead className="text-right">Including GST</TableHead>
          <TableHead>{noteLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${line.kind}:${line.number}`}>
            <TableCell className="whitespace-nowrap">
              {formatCalendarDate(line.on_date)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Link
                href={`/admin/invoices/${line.invoice_id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {line.number}
              </Link>
              {line.kind === "credit_note" ? (
                <span className="block text-xs text-muted-foreground">
                  {SALES_KIND_LABELS.credit_note} for {line.invoice_number}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="min-w-40">{line.business_name}</TableCell>
            <TableCell className={number}>
              {formatCents(line.subtotal_cents)}
            </TableCell>
            <TableCell className={number}>
              {formatCents(line.gst_cents)}
            </TableCell>
            <TableCell className={number}>
              {formatCents(line.total_cents)}
            </TableCell>
            <TableCell className="min-w-40 [overflow-wrap:anywhere]">
              {line.kind === "payment" ? line.note : salesNote(line)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className={number}>
            {formatCents(total.subtotalCents)}
          </TableCell>
          <TableCell className={number}>
            {formatCents(total.gstCents)}
          </TableCell>
          <TableCell className={number}>
            {formatCents(total.totalCents)}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/**
 * Sales and GST for a month, quarter, financial year or any dates (owner,
 * 03/11/2026: invoicing stays in Shifta, so the BAS figures come from
 * here): invoices and credit notes issued, and payments received, with a
 * spreadsheet for the accountant.
 */
export default async function SalesPage({
  searchParams,
}: PageProps<"/admin/sales">) {
  await requireAdmin();
  const params = await searchParams;
  const today = sydneyDateKey(new Date());
  const kind = choiceParam(params, "period", SALES_PERIODS);
  const from = textParam(params, "from");
  const to = textParam(params, "to");
  const custom = kind ? null : customPeriod(from, to);
  const badDates = !kind && (from !== "" || to !== "") && !custom;
  const current = kind ?? (custom ? undefined : "this_month");
  const period =
    (kind ? salesPeriodOf(kind, today) : custom) ??
    salesPeriodOf("this_month", today);

  const lines = await loadSalesLines(period);
  const totals = salesTotals(lines);
  const sales = lines.filter((line) => line.kind !== "payment");
  const payments = lines.filter((line) => line.kind === "payment");
  const csv = `/admin/sales/csv?from=${period.from}&to=${period.to}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales and GST"
        description="Invoices and credit notes issued, and payments received, for the BAS and the accountant."
        actions={
          <Button asChild variant="outline">
            <a href={csv} download>
              <Download aria-hidden />
              Spreadsheet (CSV)
            </a>
          </Button>
        }
      />

      <div className="space-y-4">
        <nav aria-label="Periods" className="flex flex-wrap gap-2">
          {SALES_PERIODS.map((value) => (
            <Button
              key={value}
              asChild
              variant={value === current ? "secondary" : "outline"}
            >
              <Link
                href={`/admin/sales?period=${value}`}
                aria-current={value === current ? "page" : undefined}
              >
                {SALES_PERIOD_LABELS[value]}
              </Link>
            </Button>
          ))}
        </nav>
        <form
          key={`${period.from}:${period.to}`}
          action="/admin/sales"
          className="flex flex-wrap items-end gap-3"
        >
          <FormField id="from" label="From">
            {(field) => (
              <Input
                {...field}
                name="from"
                type="date"
                defaultValue={period.from}
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
          <Button type="submit">Show</Button>
        </form>
        {badDates ? (
          <Alert variant="warning">
            <AlertDescription>
              Choose a start date before the end date, at most a year apart.
              Showing this month instead.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <section aria-labelledby="summary" className="space-y-3">
        <h2 id="summary" className="text-lg font-semibold">
          {formatCalendarDate(period.from)} to {formatCalendarDate(period.to)}
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Sales, excluding GST"
            value={formatCents(totals.sales.subtotalCents)}
            detail={`${plural(totals.invoiced.count, "invoice", "invoices")}, less ${plural(totals.credited.count, "credit note", "credit notes")}`}
          />
          <StatTile
            label="GST on sales"
            value={formatCents(totals.sales.gstCents)}
            detail={`${formatCents(totals.invoiced.gstCents)} invoiced, less ${formatCents(Math.abs(totals.credited.gstCents))} credited`}
          />
          <StatTile
            label="Sales, including GST"
            value={formatCents(totals.sales.totalCents)}
            detail="What's invoiced, less what's credited"
          />
          <StatTile
            label="Received"
            value={formatCents(totals.received.totalCents)}
            detail={`${plural(totals.received.count, "payment", "payments")}, with ${formatCents(totals.received.gstCents)} GST`}
          />
        </dl>
        <p className="max-w-3xl text-sm text-muted-foreground">
          By the dates invoices and credit notes were issued (accruals). For the
          BAS on that basis, the sales including GST go at G1 and the GST on
          them at 1A. On a cash basis, use what was received, by the day each
          invoice was marked paid. The accountant can confirm which applies.
        </p>
      </section>

      <section aria-labelledby="issued" className="space-y-3">
        <h2 id="issued" className="text-lg font-semibold">
          Invoices and credit notes
        </h2>
        {sales.length > 0 ? (
          <SalesTable
            label="Invoices and credit notes issued"
            lines={sales}
            total={totals.sales}
            dateLabel="Issued"
            noteLabel="Status or reason"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No invoices or credit notes were issued in this period.
          </p>
        )}
      </section>

      <section aria-labelledby="received" className="space-y-3">
        <h2 id="received" className="text-lg font-semibold">
          Payments received
        </h2>
        {payments.length > 0 ? (
          <SalesTable
            label="Payments received"
            lines={payments}
            total={totals.received}
            dateLabel="Paid"
            noteLabel="Reference"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No invoices were marked paid in this period.
          </p>
        )}
        <p className="max-w-3xl text-sm text-muted-foreground">
          Each payment is what was owed on the day: the invoice&apos;s total,
          less any credit notes issued by then.
        </p>
      </section>
    </div>
  );
}
