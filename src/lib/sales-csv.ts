import { formatAbn } from "@/adapters/abn/validate";
import type { SalesKind, SalesLine } from "@/domain/sales";

import { csvMoney, csvText } from "./csv";
import { formatCalendarDate } from "./format";

export const SALES_KIND_LABELS: Record<SalesKind, string> = {
  invoice: "Invoice",
  credit_note: "Credit note",
  payment: "Payment",
};

const INVOICE_STATUS: Record<string, string> = {
  issued: "Unpaid",
  paid: "Paid",
  credited: "Credited in full",
};

/** What the last column says: an invoice's status, a credit's reason, a payment's reference. */
export function salesNote(line: SalesLine): string {
  switch (line.kind) {
    case "invoice":
      return INVOICE_STATUS[line.status ?? ""] ?? "";
    case "credit_note":
      return line.note ?? "";
    case "payment":
      return line.note ? `Reference ${line.note}` : "";
  }
}

/**
 * The sales and GST report as a spreadsheet for the accountant: a row for
 * each invoice, credit note (negative) and payment, with the amounts
 * excluding GST, the GST, and including it. It starts with a byte order
 * mark so spreadsheets read names with accents correctly.
 */
export function salesCsv(lines: readonly SalesLine[]): string {
  const header = [
    "Type",
    "Date",
    "Number",
    "Invoice",
    "Business",
    "ABN",
    "Excluding GST",
    "GST",
    "Including GST",
    "Notes",
  ].join(",");
  const rows = lines.map((line) =>
    [
      csvText(SALES_KIND_LABELS[line.kind]),
      formatCalendarDate(line.on_date),
      csvText(line.number),
      csvText(line.invoice_number),
      csvText(line.business_name),
      csvText(formatAbn(line.abn)),
      csvMoney(line.subtotal_cents),
      csvMoney(line.gst_cents),
      csvMoney(line.total_cents),
      csvText(salesNote(line)),
    ].join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}
