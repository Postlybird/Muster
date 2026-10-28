import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import {
  billRuleFromRow,
  costShift,
  emptyMinutes,
  hourlyBillCents,
  percentOf,
  splitShift,
  sumCosts,
  totalOnCostPct,
  type CostRules,
  type HoursRules,
  type MinutesByType,
} from "./pay";
import type { RateCard } from "./rates";

const SYDNEY = "Australia/Sydney";

/** A Sydney wall-clock time, e.g. "2026-11-04T07:00". */
function sydney(local: string, timeZone = SYDNEY): Date {
  return fromZonedTime(`${local}:00`, timeZone);
}

const rules: HoursRules = {
  timeZone: SYDNEY,
  publicHolidays: new Set(["2026-12-25", "2026-12-28"]),
  overtimeAfterMinutes: 456, // 7.6 hours
  night: { start: "19:00", end: "06:00" },
};

function minutes(values: Partial<MinutesByType>): MinutesByType {
  return { ...emptyMinutes(), ...values };
}

function split(
  start: string,
  end: string,
  breakMinutes = 0,
  overrides: Partial<HoursRules> = {},
) {
  const timeZone = overrides.timeZone ?? SYDNEY;
  return splitShift(
    {
      start: sydney(start, timeZone),
      end: sydney(end, timeZone),
      breakMinutes,
    },
    { ...rules, ...overrides },
  );
}

describe("splitting a shift into rate types", () => {
  it("pays a weekday shift at ordinary rates, then overtime after 7.6 hours", () => {
    // Wednesday 7:00 am to 3:30 pm with a 30-minute break: 8 hours worked.
    expect(split("2026-11-04T07:00", "2026-11-04T15:30", 30)).toEqual(
      minutes({ ordinary: 456, overtime: 24 }),
    );
  });

  it("pays Saturday hours at the Saturday rate", () => {
    expect(split("2026-11-07T08:00", "2026-11-07T12:00")).toEqual(
      minutes({ saturday: 240 }),
    );
  });

  it("splits a Friday night shift at midnight", () => {
    // Break in the middle: 11:45 pm to 12:15 am.
    expect(split("2026-11-06T20:00", "2026-11-07T04:00", 30)).toEqual(
      minutes({ night: 225, saturday: 225 }),
    );
  });

  it("puts an explicit break where it was taken", () => {
    const result = splitShift(
      {
        start: sydney("2026-11-06T20:00"),
        end: sydney("2026-11-07T04:00"),
        breakMinutes: 30,
        breaks: [
          {
            start: sydney("2026-11-06T20:00"),
            end: sydney("2026-11-06T20:30"),
          },
        ],
      },
      rules,
    );
    expect(result).toEqual(minutes({ night: 210, saturday: 240 }));
  });

  it("pays public holidays at the public holiday rate, ahead of everything else", () => {
    expect(split("2026-12-25T09:00", "2026-12-25T13:00")).toEqual(
      minutes({ public_holiday: 240 }),
    );
    // Boxing Day falls on a Saturday; the Monday after is the holiday.
    expect(split("2026-12-28T20:00", "2026-12-28T23:00")).toEqual(
      minutes({ public_holiday: 180 }),
    );
  });

  it("pays early-morning hours at the night rate", () => {
    expect(split("2026-11-05T05:00", "2026-11-05T09:00")).toEqual(
      minutes({ night: 60, ordinary: 180 }),
    );
  });

  it("gives overtime priority over night hours", () => {
    // Tuesday noon to 10 pm, break 4:45 to 5:15 pm: overtime from 8:06 pm.
    expect(split("2026-11-03T12:00", "2026-11-03T22:00", 30)).toEqual(
      minutes({ ordinary: 390, night: 66, overtime: 114 }),
    );
  });

  it("counts real hours when daylight saving starts", () => {
    // Clocks go forward an hour at 2 am on Sunday 4 October 2026.
    expect(split("2026-10-03T22:00", "2026-10-04T06:00")).toEqual(
      minutes({ saturday: 120, sunday: 300 }),
    );
  });

  it("counts real hours when daylight saving ends", () => {
    // Clocks go back an hour at 3 am on Sunday 4 April 2027.
    expect(split("2027-04-03T22:00", "2027-04-04T06:00")).toEqual(
      minutes({ saturday: 120, sunday: 420 }),
    );
  });

  it("uses the site's own time zone", () => {
    const adelaide = "Australia/Adelaide";
    // 11 pm Friday to 1 am Saturday in Adelaide.
    expect(
      split("2026-11-06T23:00", "2026-11-07T01:00", 0, { timeZone: adelaide }),
    ).toEqual(minutes({ night: 60, saturday: 60 }));
    // Perth has no daylight saving.
    expect(
      split("2026-11-04T09:00", "2026-11-04T13:00", 0, {
        timeZone: "Australia/Perth",
      }),
    ).toEqual(minutes({ ordinary: 240 }));
  });

  it("handles a night window that doesn't cross midnight", () => {
    expect(
      split("2026-11-04T21:00", "2026-11-04T23:30", 0, {
        night: { start: "22:00", end: "23:00" },
      }),
    ).toEqual(minutes({ ordinary: 90, night: 60 }));
  });

  it("rejects impossible shifts", () => {
    expect(() => split("2026-11-04T09:00", "2026-11-04T09:00")).toThrow(
      RangeError,
    );
    expect(() => split("2026-11-04T09:00", "2026-11-04T10:00", 60)).toThrow(
      RangeError,
    );
  });
});

const card: RateCard = {
  baseRateCents: 2650,
  multipliers: {
    ordinary: 1.25, // $33.13
    saturday: 1.75, // $46.38
    sunday: 2.25,
    public_holiday: 2.75,
    overtime: 1.875, // $49.69
    night: 1.4,
  },
};

const costRules: CostRules = {
  card,
  billRule: { method: "markup", marginPct: 18 },
  onCostPct: 23.45,
  minEngagementMinutes: 240,
  urgent: null,
  gstPct: 10,
};

describe("costing a shift", () => {
  it("adds on-costs and margin to pay for each rate type", () => {
    // $33.13 × 1.2345 × 1.18 = $48.26; $49.69 × 1.2345 × 1.18 = $72.38
    expect(hourlyBillCents(card, costRules.billRule, 23.45, "ordinary")).toBe(
      4826,
    );
    expect(hourlyBillCents(card, costRules.billRule, 23.45, "overtime")).toBe(
      7238,
    );

    const cost = costShift(minutes({ ordinary: 456, overtime: 24 }), costRules);
    expect(cost.lines).toEqual([
      {
        type: "ordinary",
        kind: "worked",
        minutes: 456,
        payRateCents: 3313,
        payCents: 25179, // 7.6 h × $33.13
        billRateCents: 4826,
        billCents: 36678,
      },
      {
        type: "overtime",
        kind: "worked",
        minutes: 24,
        payRateCents: 4969,
        payCents: 1988,
        billRateCents: 7238,
        billCents: 2895,
      },
    ]);
    expect(cost).toMatchObject({
      workedMinutes: 480,
      paidMinutes: 480,
      payCents: 27167,
      onCostCents: 6371, // 23.45%
      billCents: 39573,
      gstCents: 3957,
      totalCents: 43530,
      marginCents: 6035,
    });
  });

  it("tops a short shift up to the minimum engagement at its main rate", () => {
    const cost = costShift(minutes({ saturday: 120 }), costRules);
    expect(
      cost.lines.map((l) => [l.type, l.kind, l.minutes, l.payCents]),
    ).toEqual([
      ["saturday", "worked", 120, 9276],
      ["saturday", "minimum", 120, 9276],
    ]);
    expect(cost.paidMinutes).toBe(240);
    expect(cost.payCents).toBe(18552);
  });

  it("tops up at the higher-priority rate when two are equal", () => {
    const cost = costShift(minutes({ night: 60, saturday: 60 }), costRules);
    expect(cost.lines.at(-1)).toMatchObject({
      type: "saturday",
      kind: "minimum",
      minutes: 120,
    });
  });

  it("adds the urgent call-out loading to pay and bill", () => {
    const cost = costShift(minutes({ ordinary: 240 }), {
      ...costRules,
      urgent: { payPct: 10, billPct: 20 },
    });
    expect(cost.urgentPayCents).toBe(1325); // 10% of $132.52
    expect(cost.payCents).toBe(13252 + 1325);
    expect(cost.urgentBillCents).toBe(3861); // 20% of $193.04
    expect(cost.billCents).toBe(19304 + 3861);
  });

  it("uses fixed bill rates when the rule says so", () => {
    const fixed = {
      method: "fixed" as const,
      hourlyCents: {
        ordinary: 5500,
        saturday: 7000,
        sunday: 8500,
        public_holiday: 11000,
        overtime: 8000,
        night: 6200,
      },
    };
    const cost = costShift(minutes({ ordinary: 240 }), {
      ...costRules,
      billRule: fixed,
    });
    expect(cost.billCents).toBe(22000);
    expect(cost.marginCents).toBe(22000 - 13252 - percentOf(13252, 23.45));
  });
});

describe("on-costs and rounding", () => {
  it("replaces workers' comp with the category's own rate", () => {
    const onCosts = {
      super: 12,
      workers_comp: 5,
      payroll_tax: 5.45,
      insurance: 1,
    };
    expect(totalOnCostPct(onCosts, null)).toBe(23.45);
    expect(totalOnCostPct(onCosts, 8.2)).toBe(26.65);
  });

  it("rounds half a cent away from zero", () => {
    expect(percentOf(5, 10)).toBe(1);
    expect(percentOf(25, 10)).toBe(3);
    expect(percentOf(24, 10)).toBe(2);
  });
});

describe("estimating a job", () => {
  it("multiplies by the number of workers and works out GST on the total", () => {
    const a = costShift(minutes({ ordinary: 240 }), costRules);
    const b = costShift(minutes({ saturday: 240 }), costRules);
    const total = sumCosts([a, b], 3, 10);
    expect(total.workedMinutes).toBe(480 * 3);
    expect(total.billCents).toBe((a.billCents + b.billCents) * 3);
    expect(total.gstCents).toBe(percentOf(total.billCents, 10));
    expect(total.totalCents).toBe(total.billCents + total.gstCents);
    expect(total.marginCents).toBe(
      total.billCents - total.payCents - total.onCostCents,
    );
  });
});

describe("bill rules from the database", () => {
  const row = {
    method: "markup" as const,
    margin_pct: "15.50",
    fixed_ordinary_cents: null,
    fixed_saturday_cents: null,
    fixed_sunday_cents: null,
    fixed_public_holiday_cents: null,
    fixed_overtime_cents: null,
    fixed_night_cents: null,
  };

  it("uses the default margin when no rule applies", () => {
    expect(billRuleFromRow(null, 18)).toEqual({
      method: "markup",
      marginPct: 18,
    });
  });

  it("reads a margin or fixed rates", () => {
    expect(billRuleFromRow(row, 18)).toEqual({
      method: "markup",
      marginPct: 15.5,
    });
    expect(
      billRuleFromRow(
        {
          ...row,
          method: "fixed",
          margin_pct: null,
          fixed_ordinary_cents: 5500,
          fixed_saturday_cents: 7000,
          fixed_sunday_cents: 8500,
          fixed_public_holiday_cents: 11000,
          fixed_overtime_cents: 8000,
          fixed_night_cents: 6200,
        },
        18,
      ),
    ).toEqual({
      method: "fixed",
      hourlyCents: {
        ordinary: 5500,
        saturday: 7000,
        sunday: 8500,
        public_holiday: 11000,
        overtime: 8000,
        night: 6200,
      },
    });
  });
});
