import { describe, expect, it } from "vitest";

import type { ShiftCost } from "@/domain/pay";

import {
  cancellationWhy,
  hoursWhen,
  invoiceParts,
  invoicePartsFrom,
  poText,
} from "./pay-run-format";
import { payrollLines } from "./pay-runs";

const cost: ShiftCost = {
  workedMinutes: 480,
  paidMinutes: 480,
  lines: [
    {
      type: "ordinary",
      kind: "worked",
      minutes: 480,
      payRateCents: 3435,
      payCents: 27_480,
      billRateCents: 5004,
      billCents: 40_032,
    },
  ],
  urgentPayCents: 0,
  urgentBillCents: 0,
  allowances: [
    { name: "Fares and travel allowance", payCents: 2241, billCents: 2947 },
  ],
  payCents: 29_721,
  onCostCents: 6_700,
  billCents: 42_979,
  gstCents: 4_298,
  totalCents: 47_277,
  marginCents: 6_558,
};

describe("invoice rows (owner, 04/11/2026)", () => {
  it("give each rate its hours, rate and amount, then allowances, adding up to the charge", () => {
    const parts = invoiceParts(cost);
    expect(parts).toEqual([
      {
        label: "Ordinary",
        minutes: 480,
        rate_cents: 5004,
        amount_cents: 40_032,
      },
      {
        label: "Fares and travel allowance",
        minutes: null,
        rate_cents: null,
        amount_cents: 2947,
      },
    ]);
    expect(parts.reduce((sum, part) => sum + part.amount_cents, 0)).toBe(
      cost.billCents,
    );
  });

  it("name overtime's later hours, the minimum engagement and a call-out loading", () => {
    const callout: ShiftCost = {
      ...cost,
      lines: [
        {
          type: "ordinary",
          kind: "worked",
          minutes: 456,
          payRateCents: 3435,
          payCents: 26_106,
          billRateCents: 4660,
          billCents: 35_416,
        },
        {
          type: "overtime",
          kind: "worked",
          minutes: 120,
          payRateCents: 4809,
          payCents: 9618,
          billRateCents: 5866,
          billCents: 11_732,
        },
        {
          type: "overtime_after",
          kind: "worked",
          minutes: 24,
          payRateCents: 6183,
          payCents: 2473,
          billRateCents: 7542,
          billCents: 3017,
        },
        {
          type: "saturday",
          kind: "minimum",
          minutes: 60,
          payRateCents: 4809,
          payCents: 4809,
          billRateCents: 6000,
          billCents: 6000,
        },
      ],
      urgentBillCents: 11_233,
      allowances: [],
      billCents: 35_416 + 11_732 + 3017 + 6000 + 11_233,
    };
    expect(invoiceParts(callout).map((part) => part.label)).toEqual([
      "Ordinary",
      "Overtime",
      "Overtime, later hours",
      "Minimum engagement (Saturday)",
      "Call-out loading",
    ]);
    expect(invoiceParts(callout).at(-1)).toEqual({
      label: "Call-out loading",
      minutes: null,
      rate_cents: null,
      amount_cents: 11_233,
    });
    expect(
      invoiceParts(callout).reduce((sum, part) => sum + part.amount_cents, 0),
    ).toBe(callout.billCents);
  });

  it("say when the hours were, in the site's time zone", () => {
    const hours = {
      start: "2026-11-02T20:00:00Z",
      finish: "2026-11-03T04:30:00Z",
      breakMinutes: 30,
    };
    expect(hoursWhen(hours, "Australia/Sydney")).toBe(
      "7:00 am to 3:30 pm, 30 min break",
    );
    expect(hoursWhen({ ...hours, breakMinutes: 0 }, "Australia/Perth")).toBe(
      "4:00 am to 12:30 pm",
    );
    expect(cancellationWhy(hours.start, false, "Australia/Sydney")).toBe(
      "Cancelled at short notice (shift from 7:00 am)",
    );
  });
});

describe("invoice rows as saved", () => {
  it("are read back, and lines saved before them have none", () => {
    expect(invoicePartsFrom(invoiceParts(cost))).toEqual(invoiceParts(cost));
    expect(invoicePartsFrom(null)).toBeNull();
    expect(invoicePartsFrom([{ label: "Ordinary" }, "nonsense"])).toEqual([]);
  });

  it("show a PO number once", () => {
    expect(poText("4471")).toBe("PO 4471");
    expect(poText("PO-4471")).toBe("PO-4471");
    expect(poText("po4471")).toBe("po4471");
    expect(poText("P.O. 4471")).toBe("P.O. 4471");
    expect(poText("POLY-12")).toBe("PO POLY-12");
  });
});

describe("allowances in the payroll file (owner, 03/11/2026)", () => {
  it("are paid in the payroll file, by name, after any call-out loading", () => {
    const [line] = payrollLines([
      {
        kind: "hours",
        work_date: "2026-11-03",
        start_at: "2026-11-02T20:00:00Z",
        finish_at: "2026-11-03T04:30:00Z",
        break_minutes: 30,
        hours: 8,
        work_type: "General labourer, level 1",
        site_name: "Parramatta",
        allowance_cents: 2748,
        pay_cents: 32_469,
        timesheets: { timesheet_costs: { cost } },
        workers: {
          legal_first_name: "Jo",
          legal_last_name: "Smith",
          payroll_employee_id: "E1",
        },
        businesses: { legal_name: "Acme Pty Ltd", trading_name: "Acme" },
      },
    ]);
    expect(line?.allowances).toEqual([
      { name: "Urgent call-out loading", amountCents: 2748 },
      { name: "Fares and travel allowance", amountCents: 2241 },
    ]);
  });

  it("aren't there for hours costed before allowances", () => {
    const { allowances: _none, ...before } = cost;
    const [line] = payrollLines([
      {
        kind: "hours",
        work_date: "2026-11-03",
        start_at: "2026-11-02T20:00:00Z",
        finish_at: "2026-11-03T04:30:00Z",
        break_minutes: 30,
        hours: 8,
        work_type: "General labourer, level 1",
        site_name: "Parramatta",
        allowance_cents: 0,
        pay_cents: 27_480,
        timesheets: { timesheet_costs: { cost: before } },
        workers: null,
        businesses: null,
      },
    ]);
    expect(line?.allowances).toEqual([]);
  });
});
