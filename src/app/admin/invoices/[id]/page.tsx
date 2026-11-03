import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAbn } from "@/adapters/abn/validate";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { InvoiceLines } from "@/components/invoices/invoice-lines";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Button } from "@/components/ui/button";
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

import { issueCredit, markPaid, markUnpaid } from "./actions";
import { CreditNoteForm } from "./credit-note-form";
import { MarkPaidForm } from "./mark-paid-form";

export const metadata: Metadata = { title: "Invoice" };

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value || "—"}</dd>
    </div>
  );
}

/**
 * One invoice: who it's for, its lines, any credit notes against it, and
 * whether it's been paid.
 */
export default async function AdminInvoicePage({
  params,
}: PageProps<"/admin/invoices/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invoice }, { data: lines }, { data: creditNotes }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, number, issued_on, due_on, subtotal_cents, gst_cents, total_cents, credited_cents, status, pdf_path, emailed_to, emailed_at, reminders_sent, last_reminder_on, paid_on, payment_reference, pay_run_id, pay_runs(period_start, period_end), businesses(id, legal_name, trading_name, abn, accounts_email), profiles(full_name)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.rpc("invoice_lines", { p_invoice_id: id }),
      supabase
        .from("credit_notes")
        .select(
          "id, number, issued_on, reason, total_cents, gst_cents, pdf_path, emailed_to, emailed_at, profiles(full_name)",
        )
        .eq("invoice_id", id)
        .order("created_at"),
    ]);
  if (!invoice) notFound();
  const today = sydneyDateKey(new Date());
  const status = invoiceStatus(invoice, today);
  const business = invoice.businesses;
  const leftCents = invoice.total_cents - invoice.credited_cents;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={
          business ? (
            <Link
              href={`/admin/businesses/${business.id}`}
              className="underline-offset-4 hover:underline"
            >
              {business.trading_name || business.legal_name}
            </Link>
          ) : null
        }
        actions={
          invoice.pdf_path ? (
            <Button asChild variant="outline">
              <a href={`/admin/invoices/${invoice.id}/pdf`} download>
                <Download aria-hidden />
                PDF
              </a>
            </Button>
          ) : null
        }
      />

      <WhatsNext
        status={adminInvoiceStatuses[status]}
        detail={
          invoice.status === "paid" && invoice.paid_on
            ? `Paid ${formatCalendarDate(invoice.paid_on)}${invoice.payment_reference ? `, reference ${invoice.payment_reference}` : ""}${invoice.profiles?.full_name ? `. Marked by ${invoice.profiles.full_name}.` : "."}`
            : invoice.status === "credited"
              ? `${formatCents(invoice.credited_cents)} credited.`
              : invoice.credited_cents > 0
                ? `${formatCents(leftCents)} due ${formatCalendarDate(invoice.due_on)}, after ${formatCents(invoice.credited_cents)} credited.`
                : `Due ${formatCalendarDate(invoice.due_on)}.`
        }
      />

      <dl className="space-y-2">
        <Detail label="Issued" value={formatCalendarDate(invoice.issued_on)} />
        <Detail label="Due" value={formatCalendarDate(invoice.due_on)} />
        <Detail
          label="Pay run"
          value={
            invoice.pay_runs ? (
              <Link
                href={`/admin/pay-runs/${invoice.pay_run_id}`}
                className="underline underline-offset-4"
              >
                Week of{" "}
                {weekLabel({
                  start: invoice.pay_runs.period_start,
                  end: invoice.pay_runs.period_end,
                })}
              </Link>
            ) : null
          }
        />
        <Detail label="Bill to" value={business?.legal_name} />
        <Detail label="ABN" value={business ? formatAbn(business.abn) : null} />
        <Detail
          label="Emailed"
          value={
            invoice.emailed_at
              ? `${invoice.emailed_to}, ${formatDateTime(invoice.emailed_at)}`
              : "Not yet"
          }
        />
        <Detail
          label="Overdue reminders"
          value={
            invoice.reminders_sent > 0 && invoice.last_reminder_on
              ? `${invoice.reminders_sent} sent, the last on ${formatCalendarDate(invoice.last_reminder_on)}`
              : "None sent"
          }
        />
      </dl>

      <section aria-labelledby="lines" className="space-y-3">
        <h2 id="lines" className="text-lg font-semibold">
          Lines
        </h2>
        <InvoiceLines
          lines={lines ?? []}
          subtotalCents={invoice.subtotal_cents}
          gstCents={invoice.gst_cents}
          totalCents={invoice.total_cents}
        />
      </section>

      <section aria-labelledby="credit-notes" className="space-y-3">
        <h2 id="credit-notes" className="text-lg font-semibold">
          Credit notes
        </h2>
        <p className="text-sm text-muted-foreground">
          An invoice that&apos;s gone out is never changed. To correct it, issue
          a credit note: it takes its share of the GST, lowers what&apos;s owed,
          and is emailed to the business with its PDF.
        </p>
        {creditNotes?.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {creditNotes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-medium">
                    {note.number}: {formatCents(note.total_cents)}{" "}
                    <span className="font-normal text-muted-foreground">
                      (GST {formatCents(note.gst_cents)}), issued{" "}
                      {formatCalendarDate(note.issued_on)}
                      {note.profiles?.full_name
                        ? ` by ${note.profiles.full_name}`
                        : ""}
                    </span>
                  </p>
                  <p className="[overflow-wrap:anywhere]">{note.reason}</p>
                  <p className="[overflow-wrap:anywhere] text-muted-foreground">
                    {note.emailed_at
                      ? `Emailed to ${note.emailed_to}, ${formatDateTime(note.emailed_at)}`
                      : "Not emailed yet"}
                  </p>
                </div>
                {note.pdf_path ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/admin/invoices/${invoice.id}/credit-notes/${note.id}/pdf`}
                      download
                      aria-label={`Download ${note.number} (PDF)`}
                    >
                      <Download aria-hidden />
                      {note.number}
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <CreditNoteForm
          action={issueCredit.bind(null, invoice.id)}
          leftLabel={leftCents > 0 ? formatCents(leftCents) : null}
        />
      </section>

      {invoice.status === "credited" ? null : (
        <section aria-labelledby="payment" className="space-y-3">
          <h2 id="payment" className="text-lg font-semibold">
            Payment
          </h2>
          {invoice.status === "paid" ? (
            <ConfirmAction
              trigger={<Button variant="outline">Mark as not paid</Button>}
              title="Mark it as not paid?"
              description="Use this if the payment was matched to the wrong invoice. It goes back to unpaid."
              confirmLabel="Mark as not paid"
              action={markUnpaid.bind(null, invoice.id)}
            />
          ) : (
            <MarkPaidForm
              action={markPaid.bind(null, invoice.id)}
              today={today}
            />
          )}
        </section>
      )}
    </div>
  );
}
