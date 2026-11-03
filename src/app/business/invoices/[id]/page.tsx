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

/**
 * One weekly invoice: each line, the totals, any credit notes against it,
 * and how to pay it.
 */
export default async function BusinessInvoicePage({
  params,
}: PageProps<"/business/invoices/[id]">) {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invoice }, { data: lines }, { data: creditNotes }, settings] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, number, issued_on, due_on, subtotal_cents, gst_cents, total_cents, credited_cents, status, paid_on, pdf_path",
        )
        .eq("id", id)
        .eq("business_id", business.id)
        .maybeSingle(),
      supabase.rpc("invoice_lines", { p_invoice_id: id }),
      supabase
        .from("credit_notes")
        .select(
          "id, number, issued_on, reason, total_cents, gst_cents, pdf_path",
        )
        .eq("invoice_id", id)
        .eq("business_id", business.id)
        .order("created_at"),
      getAllSettings(),
    ]);
  if (!invoice) notFound();
  const status = invoiceStatus(invoice, sydneyDateKey(new Date()));
  const leftCents = invoice.total_cents - invoice.credited_cents;
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
            : invoice.status === "credited"
              ? `${formatCents(invoice.credited_cents)} credited.`
              : invoice.credited_cents > 0
                ? `${formatCents(leftCents)} due by ${formatCalendarDate(invoice.due_on)}, after ${formatCents(invoice.credited_cents)} credited.`
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

      {creditNotes?.length ? (
        <section aria-labelledby="credit-notes" className="space-y-3">
          <h2 id="credit-notes" className="text-lg font-semibold">
            Credit notes
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {creditNotes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-medium">
                    {note.number}: {formatCents(note.total_cents)} credited{" "}
                    <span className="font-normal text-muted-foreground">
                      (GST {formatCents(note.gst_cents)}),{" "}
                      {formatCalendarDate(note.issued_on)}
                    </span>
                  </p>
                  <p className="[overflow-wrap:anywhere]">{note.reason}</p>
                </div>
                {note.pdf_path ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/business/invoices/${invoice.id}/credit-notes/${note.id}/pdf`}
                      download
                      aria-label={`Download ${note.number} (PDF)`}
                    >
                      <Download aria-hidden />
                      Download {note.number}
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {invoice.status === "issued" && bank.account_number ? (
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
