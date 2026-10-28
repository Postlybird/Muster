import "server-only";

import type { SettingsValues } from "@/config/settings";
import { isRunDay, lastFullWeek, type Week } from "@/domain/pay-runs";
import { formatCalendarDate, formatCents, sydneyDateKey } from "@/lib/format";
import { renderInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";
import {
  planPayRunWith,
  savePayRunWith,
  type PayRunPlan,
} from "@/lib/pay-runs";
import { createAdminClient } from "@/lib/supabase/admin";

import { emailTemplate } from "./notifications";
import { getAllSettings } from "./settings";
import { costTimesheets } from "./timesheets";

/**
 * The weekly pay and billing run (brief §4.8). Rates, pay and the run's
 * lines are admin-only, so this works with the service-role key; admins
 * reach it through requireAdmin() pages and actions, and the scheduler
 * through the cron route. Businesses read their invoices themselves.
 */

type Admin = ReturnType<typeof createAdminClient>;

/** What's missing from our details that every tax invoice needs. */
export function missingInvoiceDetails(settings: SettingsValues): string[] {
  const { company_details: company, bank_details: bank } = settings;
  return [
    !company.legal_name && "our legal name",
    !company.abn && "our ABN",
    !bank.account_name && "the bank account name",
    !bank.bsb && "the BSB",
    !bank.account_number && "the account number",
  ].filter((item): item is string => !!item);
}

export type PayRunPreview = {
  week: Week;
  /** The week's run, if it's been done (or a later one has). */
  run: { id: string; periodStart: string } | null;
  plan: PayRunPlan | null;
  missingDetails: string[];
};

/** Approved hours are paid as costed, so cost anything waiting first. */
async function costWaitingHours() {
  for (let i = 0; i < 10; i++) {
    const { costed } = await costTimesheets();
    if (costed < 500) return;
  }
}

/** The run due now: the last full week, and what it would pay and bill. */
export async function previewPayRun(): Promise<PayRunPreview> {
  const admin = createAdminClient();
  const settings = await getAllSettings();
  const today = sydneyDateKey(new Date());
  const week = lastFullWeek(today);
  const { data: latest, error } = await admin
    .from("pay_runs")
    .select("id, period_start")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load pay runs: ${error.message}`);
  const missingDetails = missingInvoiceDetails(settings);
  if (latest && latest.period_start >= week.start) {
    return {
      week,
      run: { id: latest.id, periodStart: latest.period_start },
      plan: null,
      missingDetails,
    };
  }
  await costWaitingHours();
  const plan = await planPayRunWith(admin, week, settings, today);
  return { week, run: null, plan, missingDetails };
}

/** A reason the run can't go ahead, worded for the admin. */
export class PayRunProblem extends Error {}

/**
 * Runs the last full week: saves the lines and invoices, then makes each
 * invoice's PDF and emails it. `runBy` is the admin, or null when the
 * scheduler runs it.
 */
export async function runPayRun(runBy: string | null) {
  const preview = await previewPayRun();
  if (preview.run) throw new PayRunProblem("That week has already been run.");
  if (preview.missingDetails.length > 0) {
    throw new PayRunProblem(
      `Add ${preview.missingDetails.join(", ")} in Settings first.`,
    );
  }
  const plan = preview.plan!;
  if (plan.lines.length === 0) {
    throw new PayRunProblem("There's nothing to pay or invoice for that week.");
  }
  let runId: string;
  try {
    runId = await savePayRunWith(createAdminClient(), plan, runBy);
  } catch (error) {
    throw new PayRunProblem(
      error instanceof Error ? error.message : "The run couldn't be saved.",
    );
  }
  const sent = await finishInvoices(runId);
  return {
    runId,
    lines: plan.lines.length,
    invoices: plan.invoices.length,
    ...sent,
  };
}

/**
 * The scheduled run (cron job "pay-run"): on the run day (a setting), runs
 * the last full week if it hasn't been, or finishes any invoice an earlier
 * attempt couldn't make or send.
 */
export async function scheduledPayRun() {
  const settings = await getAllSettings();
  if (!isRunDay(sydneyDateKey(new Date()), settings.weekly_run_day)) {
    return { skipped: "Not the run day" };
  }
  const preview = await previewPayRun();
  if (preview.run) {
    return {
      skipped: "Already run",
      ...(await finishInvoices(preview.run.id)),
    };
  }
  if (preview.missingDetails.length > 0) {
    return { skipped: `Missing ${preview.missingDetails.join(", ")}` };
  }
  if (!preview.plan || preview.plan.lines.length === 0) {
    return { skipped: "Nothing to pay" };
  }
  return runPayRun(null);
}

async function licencesFor(admin: Admin, states: string[]) {
  if (states.length === 0) return [];
  const { data, error } = await admin
    .from("licences")
    .select(
      "jurisdiction, licence_number, jurisdictions(show_licence_on_invoice)",
    )
    .in("jurisdiction", states)
    .eq("status", "active")
    .is("archived_at", null);
  if (error) throw new Error(`Couldn't load licences: ${error.message}`);
  return (data ?? [])
    .filter((row) => row.jurisdictions?.show_licence_on_invoice)
    .map((row) => `${row.jurisdiction} ${row.licence_number}`)
    .sort();
}

/** Everything printed on an invoice, from what the run saved. */
async function invoicePdfData(
  admin: Admin,
  invoiceId: string,
  settings: SettingsValues,
): Promise<{ data: InvoicePdfData; businessId: string }> {
  const [{ data: invoice, error }, { data: lines, error: linesError }] =
    await Promise.all([
      admin
        .from("invoices")
        .select(
          "number, issued_on, due_on, subtotal_cents, gst_cents, total_cents, business_id, pay_runs(period_start, period_end), businesses(legal_name, trading_name, abn, billing_contact_name, accounts_email)",
        )
        .eq("id", invoiceId)
        .single(),
      admin
        .from("pay_run_lines")
        .select(
          "work_date, description, detail, hours, bill_cents, assignments(shifts(jobs(sites(state))))",
        )
        .eq("invoice_id", invoiceId)
        .order("work_date")
        .order("description"),
    ]);
  if (error || !invoice?.pay_runs || !invoice.businesses) {
    throw new Error(`Couldn't load invoice ${invoiceId}: ${error?.message}`);
  }
  if (linesError) {
    throw new Error(`Couldn't load invoice lines: ${linesError.message}`);
  }
  const states = [
    ...new Set(
      (lines ?? []).flatMap(
        (line) => line.assignments?.shifts?.jobs?.sites?.state ?? [],
      ),
    ),
  ];
  const company = settings.company_details;
  const bank = settings.bank_details;
  return {
    businessId: invoice.business_id,
    data: {
      number: invoice.number,
      issuedOn: invoice.issued_on,
      dueOn: invoice.due_on,
      week: {
        start: invoice.pay_runs.period_start,
        end: invoice.pay_runs.period_end,
      },
      from: {
        legalName: company.legal_name,
        abn: company.abn,
        address: company.address,
        email: company.email,
        phone: company.phone,
        licences: await licencesFor(admin, states),
      },
      to: {
        legalName: invoice.businesses.legal_name,
        tradingName: invoice.businesses.trading_name,
        abn: invoice.businesses.abn,
        contact: invoice.businesses.billing_contact_name,
        email: invoice.businesses.accounts_email,
      },
      lines: (lines ?? []).map((line) => ({
        date: line.work_date,
        description: line.description,
        detail: line.detail,
        hours: Number(line.hours),
        amountCents: line.bill_cents,
      })),
      subtotalCents: invoice.subtotal_cents,
      gstCents: invoice.gst_cents,
      totalCents: invoice.total_cents,
      bank: {
        accountName: bank.account_name,
        bsb: bank.bsb,
        accountNumber: bank.account_number,
      },
    },
  };
}

/** Makes an invoice's PDF and keeps it in the private invoices bucket. */
async function storeInvoicePdf(
  admin: Admin,
  invoiceId: string,
  settings: SettingsValues,
): Promise<{ pdf: Buffer; data: InvoicePdfData }> {
  const { data, businessId } = await invoicePdfData(admin, invoiceId, settings);
  const pdf = await renderInvoicePdf(data);
  const path = `${businessId}/${data.number}.pdf`;
  const { error } = await admin.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Couldn't store ${data.number}: ${error.message}`);
  const { error: saveError } = await admin
    .from("invoices")
    .update({ pdf_path: path })
    .eq("id", invoiceId);
  if (saveError) throw new Error(`Couldn't save ${data.number}'s PDF path`);
  return { pdf, data };
}

/** An invoice's PDF as it was made, to send again. */
async function storedInvoicePdf(
  admin: Admin,
  invoiceId: string,
  settings: SettingsValues,
): Promise<{ pdf: Buffer; data: InvoicePdfData }> {
  const { data, businessId } = await invoicePdfData(admin, invoiceId, settings);
  const { data: file, error } = await admin.storage
    .from("invoices")
    .download(`${businessId}/${data.number}.pdf`);
  if (error || !file) {
    throw new Error(`Couldn't open ${data.number}'s PDF: ${error?.message}`);
  }
  return { pdf: Buffer.from(await file.arrayBuffer()), data };
}

/** The invoice email's values (src/config/notifications.ts has its words). */
function invoiceValues(data: InvoicePdfData) {
  const contact = [data.from.email, data.from.phone].filter(Boolean);
  return {
    greeting: data.to.contact ? `Hi ${data.to.contact},` : "Hello,",
    number: data.number,
    period_end: formatCalendarDate(data.week.end),
    total: formatCents(data.totalCents),
    gst: formatCents(data.gstCents),
    due: formatCalendarDate(data.dueOn),
    account_name: data.bank.accountName,
    bsb: data.bank.bsb,
    account_number: data.bank.accountNumber,
    questions:
      contact.length > 0
        ? `Questions about it? Contact us at ${contact.join(" or ")}.`
        : "",
  };
}

/**
 * Makes and emails each of a run's invoices that hasn't been yet (an
 * earlier attempt may have stopped part way). Safe to run again.
 */
export async function finishInvoices(runId: string) {
  const admin = createAdminClient();
  const settings = await getAllSettings();
  const { data: invoices, error } = await admin
    .from("invoices")
    .select("id, pdf_path, emailed_at, businesses(accounts_email)")
    .eq("pay_run_id", runId)
    .or("pdf_path.is.null,emailed_at.is.null");
  if (error) throw new Error(`Couldn't load invoices: ${error.message}`);
  let made = 0;
  let emailed = 0;
  let failed = 0;
  for (const invoice of invoices ?? []) {
    try {
      let stored: { pdf: Buffer; data: InvoicePdfData } | null = null;
      if (!invoice.pdf_path) {
        stored = await storeInvoicePdf(admin, invoice.id, settings);
        made++;
      }
      const to = invoice.businesses?.accounts_email;
      if (invoice.emailed_at || !to) continue;
      stored ??= await storedInvoicePdf(admin, invoice.id, settings);
      await emailTemplate("invoice", to, invoiceValues(stored.data), {
        url: `/business/invoices/${invoice.id}`,
        attachments: [
          {
            filename: `${stored.data.number}.pdf`,
            contentType: "application/pdf",
            content: stored.pdf.toString("base64"),
          },
        ],
      });
      await admin
        .from("invoices")
        .update({ emailed_to: to, emailed_at: new Date().toISOString() })
        .eq("id", invoice.id);
      emailed++;
    } catch (problem) {
      console.error(`Couldn't finish invoice ${invoice.id}`, problem);
      failed++;
    }
  }
  return { made, emailed, failed };
}
