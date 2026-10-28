import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import type { CostRules, HoursRules } from "./pay";
import {
  costCancellation,
  invoicesFor,
  isOverdue,
  isRunDay,
  lastFullWeek,
  weekEndsAt,
  weekOf,
} from "./pay-runs";

const SYDNEY = "Australia/Sydney";

function sydney(local: string): Date {
  return fromZonedTime(`${local}:00`, SYDNEY);
}

const hoursRules: HoursRules = {
  timeZone: SYDNEY,
  publicHolidays: new Set(),
  overtimeAfterMinutes: 456,
  night: { start: "19:00", end: "06:00" },
};

// $37.50 an hour ordinary and $45 on Saturdays; billed at pay plus 20%
// on-costs plus a 20% margin ($54 and $64.80).
const costRules: CostRules = {
  card: {
    baseRateCents: 3000,
    multipliers: {
      ordinary: 1.25,
      saturday: 1.5,
      sunday: 1.75,
      public_holiday: 2.5,
      overtime: 1.75,
      night: 1.5,
    },
  },
  billRule: { method: "markup", marginPct: 20 },
  onCostPct: 20,
  minEngagementMinutes: 180,
  urgent: null,
  gstPct: 10,
};

describe("the week a run covers", () => {
  it("runs Monday to Sunday", () => {
    for (const day of ["2026-10-26", "2026-10-28", "2026-11-01"]) {
      expect(weekOf(day)).toEqual({ start: "2026-10-26", end: "2026-11-01" });
    }
  });

  it("is the last full week before the run", () => {
    for (const day of ["2026-10-26", "2026-10-28", "2026-11-01"]) {
      expect(lastFullWeek(day)).toEqual({
        start: "2026-10-19",
        end: "2026-10-25",
      });
    }
  });

  it("runs on the day set", () => {
    expect(isRunDay("2026-10-26", "monday")).toBe(true);
    expect(isRunDay("2026-10-28", "monday")).toBe(false);
    expect(isRunDay("2026-10-28", "wednesday")).toBe(true);
  });

  it("ends at midnight on Sunday, local time", () => {
    expect(
      weekEndsAt({ start: "2026-10-19", end: "2026-10-25" }, SYDNEY),
    ).toEqual(new Date("2026-10-25T13:00:00Z"));
  });
});

describe("late business cancellations", () => {
  it("charge the recorded hours at the shift's rate, and pay nothing unless set", () => {
    const cost = costCancellation(
      {
        shift: {
          start: sydney("2026-11-07T07:00"),
          end: sydney("2026-11-07T15:00"),
          breakMinutes: 30,
        },
        chargeHours: 3,
        payHours: null,
        arrived: false,
      },
      hoursRules,
      costRules,
    );
    expect(cost.type).toBe("saturday");
    expect(cost.billMinutes).toBe(180);
    expect(cost.bill.billCents).toBe(19_440);
    expect(cost.payMinutes).toBe(0);
    expect(cost.pay.payCents).toBe(0);
  });

  it("pay a worker who had arrived the minimum engagement, and charge it", () => {
    const cost = costCancellation(
      {
        shift: {
          start: sydney("2026-11-04T07:00"),
          end: sydney("2026-11-04T11:00"),
          breakMinutes: 0,
        },
        chargeHours: 2,
        payHours: null,
        arrived: true,
      },
      hoursRules,
      costRules,
    );
    expect(cost.type).toBe("ordinary");
    expect([cost.billMinutes, cost.payMinutes]).toEqual([180, 180]);
    expect(cost.bill.billCents).toBe(16_200);
    expect(cost.pay.payCents).toBe(11_250);
  });

  it("carry an urgent call-out's loadings", () => {
    const cost = costCancellation(
      {
        shift: {
          start: sydney("2026-11-04T07:00"),
          end: sydney("2026-11-04T11:00"),
          breakMinutes: 0,
        },
        chargeHours: 3,
        payHours: 3,
        arrived: false,
      },
      hoursRules,
      { ...costRules, urgent: { payPct: 10, billPct: 20 } },
    );
    expect(cost.bill.billCents).toBe(19_440);
    expect(cost.pay.payCents).toBe(12_375);
    expect(cost.pay.urgentPayCents).toBe(1_125);
  });
});

describe("invoices", () => {
  it("are one per business, with GST on the subtotal and due on its terms", () => {
    expect(
      invoicesFor(
        [
          { business_id: "b1", bill_cents: 22_000 },
          { business_id: "b2", bill_cents: 10_001 },
          { business_id: "b1", bill_cents: 13_500 },
        ],
        {
          issuedOn: "2026-10-28",
          gstPct: 10,
          termsDays: (id) => (id === "b1" ? 14 : 7),
        },
      ),
    ).toEqual([
      {
        business_id: "b1",
        issued_on: "2026-10-28",
        due_on: "2026-11-11",
        subtotal_cents: 35_500,
        gst_cents: 3_550,
        total_cents: 39_050,
      },
      {
        business_id: "b2",
        issued_on: "2026-10-28",
        due_on: "2026-11-04",
        subtotal_cents: 10_001,
        gst_cents: 1_000,
        total_cents: 11_001,
      },
    ]);
  });

  it("are overdue once unpaid after the due date", () => {
    const today = "2026-10-28";
    expect(isOverdue({ status: "issued", due_on: "2026-10-27" }, today)).toBe(
      true,
    );
    expect(isOverdue({ status: "issued", due_on: today }, today)).toBe(false);
    expect(isOverdue({ status: "paid", due_on: "2026-10-01" }, today)).toBe(
      false,
    );
  });
});
