import { describe, expect, it } from "vitest";

import type { ShiftCost } from "@/domain/pay";

import { hoursDetail } from "./pay-run-format";
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

describe("allowances on invoices and in the payroll file (owner, 03/11/2026)", () => {
  it("are charged on the invoice line, by name", () => {
    expect(
      hoursDetail(
        {
          start: "2026-11-02T20:00:00Z",
          finish: "2026-11-03T04:30:00Z",
          breakMinutes: 30,
        },
        cost,
        "Australia/Sydney",
      ),
    ).toBe(
      "7:00 am to 3:30 pm, 30 min break. 8 h ordinary at $50.04/h, Fares and travel allowance $29.47.",
    );
  });

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
