import { Download, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { businessInvoiceStatuses, invoiceStatus } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";

export const metadata: Metadata = { title: "Invoices" };

/**
 * The business's weekly invoices (brief §4.8), newest first, each with its
 * PDF. Owners and managers only.
 */
export default async function BusinessInvoicesPage() {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader title="Invoices" />
        <Alert variant="info">
          <AlertDescription>
            Your owner or managers look after invoices.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, issued_on, due_on, total_cents, status, pdf_path")
    .eq("business_id", business.id)
    .order("issued_on", { ascending: false })
    .order("number", { ascending: false })
    .limit(104);
  const today = sydneyDateKey(new Date());

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Invoices"
        description={`One a week for the hours you approved, emailed to ${business.accounts_email ?? "your accounts email"}.`}
      />
      {invoices?.length ? (
        <ul className="divide-y rounded-lg border">
          {invoices.map((invoice) => {
            const status =
              businessInvoiceStatuses[invoiceStatus(invoice, today)];
            return (
              <li
                key={invoice.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/business/invoices/${invoice.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    <StatusBadge status={status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCents(invoice.total_cents)}, issued{" "}
                    {formatCalendarDate(invoice.issued_on)}
                    {invoice.status === "paid"
                      ? ""
                      : `, due ${formatCalendarDate(invoice.due_on)}`}
                  </p>
                </div>
                {invoice.pdf_path ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/business/invoices/${invoice.id}/pdf`}
                      download
                      aria-label={`Download ${invoice.number} (PDF)`}
                    >
                      <Download aria-hidden />
                      Download {invoice.number}
                    </a>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="After workers' hours are approved, they're invoiced in the weekly run."
        />
      )}
    </div>
  );
}
