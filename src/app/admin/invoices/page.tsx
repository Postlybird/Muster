import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { adminInvoiceStatuses, invoiceStatus } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoices" };

type Row = {
  id: string;
  number: string;
  issued_on: string;
  due_on: string;
  total_cents: number;
  status: string;
  businesses: { legal_name: string; trading_name: string | null } | null;
};

function InvoiceTable({ rows, today }: { rows: Row[]; today: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Business</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Due</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((invoice) => (
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
            <TableCell className="whitespace-nowrap">
              {formatCalendarDate(invoice.issued_on)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatCalendarDate(invoice.due_on)}
            </TableCell>
            <TableCell className="text-right">
              {formatCents(invoice.total_cents)}
            </TableCell>
            <TableCell>
              <StatusBadge
                status={adminInvoiceStatuses[invoiceStatus(invoice, today)]}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Every invoice: what's owed (overdue first), then what's been paid. */
export default async function AdminInvoicesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: unpaid }, { data: paid }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, number, issued_on, due_on, total_cents, status, businesses(legal_name, trading_name)",
      )
      .eq("status", "issued")
      .order("due_on")
      .order("number"),
    supabase
      .from("invoices")
      .select(
        "id, number, issued_on, due_on, total_cents, status, businesses(legal_name, trading_name)",
      )
      .eq("status", "paid")
      .order("issued_on", { ascending: false })
      .order("number", { ascending: false })
      .limit(100),
  ]);
  const today = sydneyDateKey(new Date());
  const owed = (unpaid ?? []).reduce((sum, i) => sum + i.total_cents, 0);
  const overdue = (unpaid ?? []).filter(
    (i) => invoiceStatus(i, today) === "overdue",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Raised by each weekly pay run, on account terms. Mark them paid as the money arrives."
      />

      <section aria-labelledby="unpaid" className="space-y-3">
        <h2 id="unpaid" className="text-lg font-semibold">
          Unpaid ({unpaid?.length ?? 0})
        </h2>
        {unpaid?.length ? (
          <>
            <p className="text-sm text-muted-foreground">
              {formatCents(owed)} owed
              {overdue.length > 0
                ? `, of which ${formatCents(overdue.reduce((sum, i) => sum + i.total_cents, 0))} is overdue`
                : ""}
              .
            </p>
            <InvoiceTable rows={unpaid} today={today} />
          </>
        ) : (
          <EmptyState
            icon={Receipt}
            title="Nothing owed"
            description="Every invoice has been paid."
          />
        )}
      </section>

      <section aria-labelledby="paid" className="space-y-3">
        <h2 id="paid" className="text-lg font-semibold">
          Paid
        </h2>
        {paid?.length ? (
          <InvoiceTable rows={paid} today={today} />
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </section>
    </div>
  );
}
