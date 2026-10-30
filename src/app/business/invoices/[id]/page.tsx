import { Download } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { brand } from "@/config/brand";
import { InvoiceLines } from "@/components/invoices/invoice-lines";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Button } from "@/components/ui/button";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { businessInvoiceStatuses, invoiceStatus } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Invoice" };

/** One weekly invoice: each line, the totals, and how to pay it. */
export default async function BusinessInvoicePage({
  params,
}: PageProps<"/business/invoices/[id]">) {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invoice }, { data: lines }, settings] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, number, issued_on, due_on, subtotal_cents, gst_cents, total_cents, status, paid_on, pdf_path",
      )
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase.rpc("invoice_lines", { p_invoice_id: id }),
    getAllSettings(),
  ]);
  if (!invoice) notFound();
  const status = invoiceStatus(invoice, sydneyDateKey(new Date()));
  const bank = settings.bank_details;
  const contact = [
    settings.company_details.email || brand.supportEmail,
    settings.company_details.phone || brand.supportPhone,
  ].filter((item): item is string => !!item);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`Issued ${formatCalendarDate(invoice.issued_on)}`}
        actions={
          invoice.pdf_path ? (
            <Button asChild variant="outline">
              <a href={`/business/invoices/${invoice.id}/pdf`} download>
                <Download aria-hidden />
                Download PDF
              </a>
            </Button>
          ) : null
        }
      />

      <WhatsNext
        status={businessInvoiceStatuses[status]}
        detail={
          invoice.status === "paid" && invoice.paid_on
            ? `Paid ${formatCalendarDate(invoice.paid_on)}.`
            : `${formatCents(invoice.total_cents)} due by ${formatCalendarDate(invoice.due_on)}.`
        }
      />

      <section aria-labelledby="lines" className="space-y-3">
        <h2 id="lines" className="text-lg font-semibold">
          What it&apos;s for
        </h2>
        <InvoiceLines
          lines={lines ?? []}
          subtotalCents={invoice.subtotal_cents}
          gstCents={invoice.gst_cents}
          totalCents={invoice.total_cents}
        />
      </section>

      {invoice.status !== "paid" && bank.account_number ? (
        <section
          aria-labelledby="pay"
          className="space-y-2 rounded-lg border bg-card p-4"
        >
          <h2 id="pay" className="font-semibold">
            How to pay
          </h2>
          <p className="text-sm">By bank transfer to:</p>
          <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-1 text-sm">
            <dt className="text-muted-foreground">Account name</dt>
            <dd>{bank.account_name}</dd>
            <dt className="text-muted-foreground">BSB</dt>
            <dd>{bank.bsb}</dd>
            <dt className="text-muted-foreground">Account number</dt>
            <dd>{bank.account_number}</dd>
            <dt className="text-muted-foreground">Reference</dt>
            <dd>{invoice.number}</dd>
          </dl>
        </section>
      ) : null}

      <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
        Something not right? Contact us at {contact.join(" or ")}.
      </p>
    </div>
  );
}
