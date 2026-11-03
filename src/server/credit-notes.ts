import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { SettingsValues } from "@/config/settings";
import { formatCents } from "@/lib/format";
import {
  creditNoteOutcome,
  renderCreditNotePdf,
  type CreditNotePdfData,
} from "@/lib/invoice-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { emailTemplate } from "./notifications";
import { getAllSettings } from "./settings";

/**
 * Credit notes (owner, 03/11/2026): an invoice that's gone out is corrected
 * with a credit note, never changed. An admin issues one through
 * issue_credit_note(), which checks they're an admin; then its PDF is made
 * (in the business's folder of the invoices bucket) and emailed to the
 * business's accounts contact. Those need the service-role key, as invoices
 * do; finishCreditNotes() retries any that didn't finish, each morning.
 */

type Admin = ReturnType<typeof createAdminClient>;

/** Whether it's been emailed: sent, no accounts email, or not yet (retried). */
export type Emailed = "sent" | "no-address" | "later";

export type IssueResult =
  | { ok: true; number: string; emailed: Emailed }
  | { ok: false; error: PostgrestError };

/** Issues a credit note as the signed-in admin, then makes and emails it. */
export async function issueCreditNote(
  invoiceId: string,
  totalCents: number,
  reason: string,
): Promise<IssueResult> {
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("issue_credit_note", {
    p_invoice: invoiceId,
    p_total_cents: totalCents,
    p_reason: reason,
  });
  if (error) return { ok: false, error };
  const admin = createAdminClient();
  try {
    const finished = await finishCreditNote(admin, id, await getAllSettings());
    return { ok: true, number: finished.number, emailed: finished.emailed };
  } catch (problem) {
    // It's issued either way: the morning job makes and sends it.
    console.error(`Couldn't finish credit note ${id}`, problem);
    const { data: note } = await admin
      .from("credit_notes")
      .select("number")
      .eq("id", id)
      .single();
    return { ok: true, number: note?.number ?? "", emailed: "later" };
  }
}

async function creditNoteData(
  admin: Admin,
  id: string,
  settings: SettingsValues,
) {
  const { data: note, error } = await admin
    .from("credit_notes")
    .select(
      "id, number, issued_on, reason, subtotal_cents, gst_cents, total_cents, business_id, invoice_id, pdf_path, emailed_at, created_at, invoices(number, issued_on, status, total_cents), businesses(legal_name, trading_name, abn, billing_contact_name, accounts_email)",
    )
    .eq("id", id)
    .single();
  if (error || !note.invoices || !note.businesses) {
    throw new Error(`Couldn't load credit note ${id}: ${error?.message}`);
  }
  const { data: notes, error: notesError } = await admin
    .from("credit_notes")
    .select("total_cents")
    .eq("invoice_id", note.invoice_id)
    .lte("created_at", note.created_at);
  if (notesError) {
    throw new Error(`Couldn't load credit note ${id}: ${notesError.message}`);
  }
  const company = settings.company_details;
  const invoice = note.invoices;
  // What's left after this note and the ones before it, even if the PDF is
  // made later (each is its own transaction, so they never share a time).
  const owingCents =
    invoice.total_cents -
    (notes ?? []).reduce((sum, { total_cents }) => sum + total_cents, 0);
  const data: CreditNotePdfData = {
    number: note.number,
    issuedOn: note.issued_on,
    invoice: { number: invoice.number, issuedOn: invoice.issued_on },
    reason: note.reason,
    from: {
      legalName: company.legal_name,
      abn: company.abn,
      address: company.address,
      email: company.email,
      phone: company.phone,
      licences: [],
    },
    to: {
      legalName: note.businesses.legal_name,
      tradingName: note.businesses.trading_name,
      abn: note.businesses.abn,
      contact: note.businesses.billing_contact_name,
      email: note.businesses.accounts_email,
    },
    subtotalCents: note.subtotal_cents,
    gstCents: note.gst_cents,
    totalCents: note.total_cents,
    owingCents,
    invoicePaid: invoice.status === "paid",
  };
  return { note, data };
}

/** Makes a credit note's PDF and emails it, whichever hasn't been done. */
async function finishCreditNote(
  admin: Admin,
  id: string,
  settings: SettingsValues,
): Promise<{ number: string; emailed: Emailed }> {
  const { note, data } = await creditNoteData(admin, id, settings);
  const path = `${note.business_id}/${note.number}.pdf`;
  let pdf: Buffer | null = null;
  if (!note.pdf_path) {
    pdf = await renderCreditNotePdf(data);
    const { error } = await admin.storage
      .from("invoices")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (error)
      throw new Error(`Couldn't store ${note.number}: ${error.message}`);
    await admin.from("credit_notes").update({ pdf_path: path }).eq("id", id);
  }
  const to = data.to.email;
  if (note.emailed_at) return { number: note.number, emailed: "sent" };
  if (!to) return { number: note.number, emailed: "no-address" };
  if (!pdf) {
    const { data: file, error } = await admin.storage
      .from("invoices")
      .download(path);
    if (error || !file) {
      throw new Error(`Couldn't open ${note.number}'s PDF: ${error?.message}`);
    }
    pdf = Buffer.from(await file.arrayBuffer());
  }
  const contact = [data.from.email, data.from.phone].filter(Boolean);
  await emailTemplate(
    "credit_note",
    to,
    {
      greeting: data.to.contact ? `Hi ${data.to.contact},` : "Hello,",
      number: data.number,
      invoice: data.invoice.number,
      total: formatCents(data.totalCents),
      gst: formatCents(data.gstCents),
      reason: data.reason,
      outcome: creditNoteOutcome(data),
      questions:
        contact.length > 0
          ? `Questions about it? Contact us at ${contact.join(" or ")}.`
          : "",
    },
    {
      url: `/business/invoices/${note.invoice_id}`,
      attachments: [
        {
          filename: `${note.number}.pdf`,
          contentType: "application/pdf",
          content: pdf.toString("base64"),
        },
      ],
    },
  );
  await admin
    .from("credit_notes")
    .update({ emailed_to: to, emailed_at: new Date().toISOString() })
    .eq("id", id);
  return { number: note.number, emailed: "sent" };
}

/** Makes and emails any credit note that didn't finish (the morning job). */
export async function finishCreditNotes() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_notes")
    .select("id")
    .or("pdf_path.is.null,emailed_at.is.null")
    .order("created_at");
  if (error) throw new Error(`Couldn't load credit notes: ${error.message}`);
  if (!data?.length) return { emailed: 0, failed: 0 };
  const settings = await getAllSettings();
  let emailed = 0;
  let failed = 0;
  for (const { id } of data) {
    try {
      const done = await finishCreditNote(admin, id, settings);
      if (done.emailed === "sent") emailed++;
    } catch (problem) {
      console.error(`Couldn't finish credit note ${id}`, problem);
      failed++;
    }
  }
  return { emailed, failed };
}
