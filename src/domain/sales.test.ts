import { describe, expect, it } from "vitest";

import { salesPeriodOf, salesTotals, type SalesLine } from "./sales";

describe("sales periods", () => {
  it("are whole months", () => {
    expect(salesPeriodOf("this_month", "2026-11-03")).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(salesPeriodOf("last_month", "2026-03-31")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(salesPeriodOf("last_month", "2027-01-15")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("are BAS quarters", () => {
    expect(salesPeriodOf("this_quarter", "2026-11-03")).toEqual({
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(salesPeriodOf("last_quarter", "2026-11-03")).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(salesPeriodOf("last_quarter", "2027-02-10")).toEqual({
      from: "2026-10-01",
      to: "2026-12-31",
    });
    expect(salesPeriodOf("this_quarter", "2028-03-31")).toEqual({
      from: "2028-01-01",
      to: "2028-03-31",
    });
  });

  it("are financial years, from 1 July", () => {
    expect(salesPeriodOf("this_year", "2026-11-03")).toEqual({
      from: "2026-07-01",
      to: "2027-06-30",
    });
    expect(salesPeriodOf("this_year", "2027-06-30")).toEqual({
      from: "2026-07-01",
      to: "2027-06-30",
    });
    expect(salesPeriodOf("last_year", "2026-07-01")).toEqual({
      from: "2025-07-01",
      to: "2026-06-30",
    });
  });
});

describe("sales totals", () => {
  const line = (
    kind: SalesLine["kind"],
    subtotal: number,
    gst: number,
  ): SalesLine => ({
    kind,
    on_date: "2026-11-02",
    number: "X",
    invoice_id: "i",
    invoice_number: "INV-1",
    business_name: "B",
    abn: "1",
    subtotal_cents: subtotal,
    gst_cents: gst,
    total_cents: subtotal + gst,
    status: null,
    note: null,
  });

  it("take credit notes off what's invoiced, and count payments apart", () => {
    const totals = salesTotals([
      line("invoice", 10_000, 1_000),
      line("invoice", 20_000, 2_000),
      line("credit_note", -1_000, -100),
      line("payment", 9_000, 900),
    ]);
    expect(totals.invoiced).toEqual({
      count: 2,
      subtotalCents: 30_000,
      gstCents: 3_000,
      totalCents: 33_000,
    });
    expect(totals.credited).toEqual({
      count: 1,
      subtotalCents: -1_000,
      gstCents: -100,
      totalCents: -1_100,
    });
    expect(totals.sales).toEqual({
      count: 3,
      subtotalCents: 29_000,
      gstCents: 2_900,
      totalCents: 31_900,
    });
    expect(totals.received).toEqual({
      count: 1,
      subtotalCents: 9_000,
      gstCents: 900,
      totalCents: 9_900,
    });
  });

  it("are nothing for no lines", () => {
    expect(salesTotals([]).sales).toEqual({
      count: 0,
      subtotalCents: 0,
      gstCents: 0,
      totalCents: 0,
    });
  });
});
