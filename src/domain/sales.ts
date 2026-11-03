import { addDays } from "./pay-runs";
import type { Period } from "./reports";

/**
 * Sales and GST (owner, 03/11/2026: invoicing stays in Shifta, so the BAS
 * figures come from here). The periods the report covers, as Sydney dates
 * with both ends included: quarters are the BAS quarters (January to March,
 * and so on), and the financial year runs from 1 July to 30 June.
 */

export const SALES_PERIODS = [
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
] as const;
export type SalesPeriodKind = (typeof SALES_PERIODS)[number];

export const SALES_PERIOD_LABELS: Record<SalesPeriodKind, string> = {
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  last_quarter: "Last quarter",
  this_year: "This financial year",
  last_year: "Last financial year",
};

/** The first of a month, where `month` may run past either end of a year. */
function firstOf(year: number, month: number): string {
  const index = year * 12 + month - 1;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

/** Whole months, from the first of one. */
function months(year: number, month: number, count: number): Period {
  return {
    from: firstOf(year, month),
    to: addDays(firstOf(year, month + count), -1),
  };
}

/** The whole month, quarter or financial year, this one or the last. */
export function salesPeriodOf(kind: SalesPeriodKind, today: string): Period {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const quarter = month - ((month - 1) % 3);
  const financialYear = month >= 7 ? year : year - 1;
  switch (kind) {
    case "this_month":
      return months(year, month, 1);
    case "last_month":
      return months(year, month - 1, 1);
    case "this_quarter":
      return months(year, quarter, 3);
    case "last_quarter":
      return months(year, quarter - 3, 3);
    case "this_year":
      return months(financialYear, 7, 12);
    case "last_year":
      return months(financialYear - 1, 7, 12);
  }
}

export type SalesKind = "invoice" | "credit_note" | "payment";

/** A line of the report, from admin_sales_lines(). Credit notes are negative. */
export type SalesLine = {
  kind: SalesKind;
  on_date: string;
  number: string;
  invoice_id: string;
  invoice_number: string;
  business_name: string;
  abn: string;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  status: string | null;
  note: string | null;
};

export type SalesAmounts = {
  count: number;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
};

export type SalesTotals = {
  /** Invoices issued. */
  invoiced: SalesAmounts;
  /** Credit notes issued (negative). */
  credited: SalesAmounts;
  /** Invoices less credit notes: the sales and GST on them for the period. */
  sales: SalesAmounts;
  /** Payments marked in the period, for what was owed on the day. */
  received: SalesAmounts;
};

/** The period's totals, from its lines. */
export function salesTotals(lines: readonly SalesLine[]): SalesTotals {
  const zero = (): SalesAmounts => ({
    count: 0,
    subtotalCents: 0,
    gstCents: 0,
    totalCents: 0,
  });
  const totals: SalesTotals = {
    invoiced: zero(),
    credited: zero(),
    sales: zero(),
    received: zero(),
  };
  const add = (amounts: SalesAmounts, line: SalesLine) => {
    amounts.count++;
    amounts.subtotalCents += line.subtotal_cents;
    amounts.gstCents += line.gst_cents;
    amounts.totalCents += line.total_cents;
  };
  for (const line of lines) {
    if (line.kind === "payment") {
      add(totals.received, line);
      continue;
    }
    add(line.kind === "invoice" ? totals.invoiced : totals.credited, line);
    add(totals.sales, line);
  }
  return totals;
}
