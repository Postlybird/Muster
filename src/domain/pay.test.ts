import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import {
  allowanceBillCents,
  billRuleFromRow,
  costShift,
  emptyMinutes,
  hourlyBillCents,
  onCostPctFor,
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

/** Cleaning Services Award, Level 1 casual, 50c over (owner, 01/11/2026). */
const cleaner: RateCard = {
  baseRateCents: 2748,
  multipliers: {
    ordinary: 1.25,
    saturday: 1.75,
    sunday: 2.25,
    public_holiday: 2.75,
    overtime: 1.75,
    overtime_after: 2.25,
    night: 1.25,
    early_late: 1.4,
    night_shift: 1.55,
  },
  award: {
    overtimeAfterMinutes: 456,
    tierMinutes: 120,
    saturdayLaterFrom: null,
    ordinaryHours: null,
    earlyLate: { startsBefore: "06:00", finishesAfter: "18:00" },
    nightShiftFinishesBy: "08:00",
  },
};

/** Building and Construction General On-site Award, CW1(a) casual. */
const labourer: RateCard = {
  baseRateCents: 2884,
  multipliers: {
    ordinary: 1.25,
    saturday: 1.75,
    saturday_after: 2.25,
    sunday: 2.25,
    public_holiday: 2.75,
    overtime: 1.75,
    overtime_after: 2.25,
    night: 1.25,
  },
  award: {
    overtimeAfterMinutes: 480,
    tierMinutes: 120,
    saturdayLaterFrom: "12:00",
    ordinaryHours: { from: "07:00", to: "18:00" },
    earlyLate: null,
    nightShiftFinishesBy: null,
  },
};

/** Road Transport and Distribution Award, grade 1 casual. */
const offsider: RateCard = {
  baseRateCents: 2727,
  multipliers: {
    ordinary: 1.25,
    saturday: 1.75,
    sunday: 2.25,
    public_holiday: 2.75,
    overtime: 1.6,
    overtime_after: 2.1,
    night: 1.25,
  },
  award: {
    overtimeAfterMinutes: 456,
    tierMinutes: 120,
    saturdayLaterFrom: null,
    ordinaryHours: { from: "05:30", to: "18:30" },
    earlyLate: null,
    nightShiftFinishesBy: null,
  },
};

function splitFor(
  card: RateCard,
  start: string,
  end: string,
  breakMinutes = 0,
) {
  return splitShift(
    { start: sydney(start), end: sydney(end), breakMinutes },
    rules,
    card,
  );
}

describe("award rules on the rate card", () => {
  describe("cleaners", () => {
    it("pays a day shift at the ordinary rate", () => {
      // Wednesday 9 am to 5 pm, 30-minute break: 7.5 hours.
      expect(
        splitFor(cleaner, "2026-11-04T09:00", "2026-11-04T17:00", 30),
      ).toEqual(minutes({ ordinary: 450 }));
    });

    it("pays the whole of a shift finishing after 6 pm at the early or late shift rate", () => {
      expect(splitFor(cleaner, "2026-11-04T17:00", "2026-11-04T21:00")).toEqual(
        minutes({ early_late: 240 }),
      );
    });

    it("pays the whole of a shift starting before 6 am at the early or late shift rate", () => {
      expect(splitFor(cleaner, "2026-11-04T05:00", "2026-11-04T09:00")).toEqual(
        minutes({ early_late: 240 }),
      );
    });

    it("pays a shift finishing after midnight at the night shift rate, then overtime", () => {
      // Wednesday 10 pm to Thursday 6 am: 8 hours.
      expect(splitFor(cleaner, "2026-11-04T22:00", "2026-11-05T06:00")).toEqual(
        minutes({ night_shift: 456, overtime: 24 }),
      );
    });

    it("pays 2 hours of overtime after 7.6 hours, then the later overtime rate", () => {
      // Wednesday 7 am to 7 pm, 30-minute break: 11.5 hours, a late shift.
      expect(
        splitFor(cleaner, "2026-11-04T07:00", "2026-11-04T19:00", 30),
      ).toEqual(
        minutes({ early_late: 456, overtime: 120, overtime_after: 114 }),
      );
    });

    it("pays Saturday overtime at the Saturday rate for 2 hours, then the later overtime rate", () => {
      // Saturday 7 am to 6 pm: 11 hours.
      expect(splitFor(cleaner, "2026-11-07T07:00", "2026-11-07T18:00")).toEqual(
        minutes({ saturday: 576, overtime_after: 84 }),
      );
    });

    it("pays a Friday night shift's Saturday hours at the Saturday rate", () => {
      expect(splitFor(cleaner, "2026-11-06T22:00", "2026-11-07T04:00")).toEqual(
        minutes({ night_shift: 120, saturday: 240 }),
      );
    });
  });

  describe("labourers", () => {
    it("pays hours before 7 am as overtime", () => {
      // Wednesday 6 am to 3:30 pm, 30-minute break.
      expect(
        splitFor(labourer, "2026-11-04T06:00", "2026-11-04T15:30", 30),
      ).toEqual(minutes({ overtime: 60, ordinary: 480 }));
    });

    it("pays overtime after 8 hours and after 6 pm, at the later rate after 2 hours", () => {
      expect(
        splitFor(labourer, "2026-11-04T07:00", "2026-11-04T19:00"),
      ).toEqual(minutes({ ordinary: 480, overtime: 120, overtime_after: 120 }));
    });

    it("pays the first 2 Saturday hours at the Saturday rate, then the later rate", () => {
      expect(
        splitFor(labourer, "2026-11-07T07:00", "2026-11-07T15:00"),
      ).toEqual(minutes({ saturday: 120, saturday_after: 360 }));
    });

    it("pays every Saturday hour after noon at the later rate", () => {
      expect(
        splitFor(labourer, "2026-11-07T12:00", "2026-11-07T16:00"),
      ).toEqual(minutes({ saturday_after: 240 }));
    });

    it("pays Sundays and public holidays at their own rates", () => {
      expect(
        splitFor(labourer, "2026-11-08T07:00", "2026-11-08T15:00"),
      ).toEqual(minutes({ sunday: 480 }));
      expect(
        splitFor(labourer, "2026-12-25T07:00", "2026-12-25T11:00"),
      ).toEqual(minutes({ public_holiday: 240 }));
    });
  });

  describe("removalist offsiders", () => {
    it("pays hours before 5:30 am as overtime", () => {
      // Wednesday 4:30 am to 1 pm, 30-minute break.
      expect(
        splitFor(offsider, "2026-11-04T04:30", "2026-11-04T13:00", 30),
      ).toEqual(minutes({ overtime: 60, ordinary: 420 }));
    });

    it("pays overtime after 7.6 hours, at the later rate after 2 hours", () => {
      // Wednesday 6 am to 6:30 pm: 12.5 hours.
      expect(
        splitFor(offsider, "2026-11-04T06:00", "2026-11-04T18:30"),
      ).toEqual(minutes({ ordinary: 456, overtime: 120, overtime_after: 174 }));
    });
  });

  it("costs each award rate type at its own pay and bill rate", () => {
    const cost = costShift(
      splitFor(cleaner, "2026-11-04T07:00", "2026-11-04T19:00", 30),
      {
        card: cleaner,
        billRule: { method: "markup", marginPct: 25 },
        onCostPct: 23.45,
        minEngagementMinutes: 180,
        urgent: null,
        gstPct: 10,
      },
    );
    expect(
      cost.lines.map(({ type, minutes, payRateCents }) => ({
        type,
        minutes,
        payRateCents,
      })),
    ).toEqual([
      { type: "overtime", minutes: 120, payRateCents: 4809 },
      { type: "overtime_after", minutes: 114, payRateCents: 6183 },
      { type: "early_late", minutes: 456, payRateCents: 3847 },
    ]);
  });

  it("splits as before for rates kept before award rules existed", () => {
    const { award: _award, ...withoutRules } = cleaner;
    expect(
      splitFor(withoutRules, "2026-11-04T12:00", "2026-11-04T22:00", 30),
    ).toEqual(split("2026-11-04T12:00", "2026-11-04T22:00", 30));
  });
});

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

describe("super on overtime (owner, 03/11/2026)", () => {
  // Priced from now on: super's part of the on-costs is known.
  const priced: CostRules = {
    ...costRules,
    card: cleaner,
    superPct: 12,
  };
  const tenHours: MinutesByType = {
    ...emptyMinutes(),
    ordinary: 456,
    overtime: 120,
    overtime_after: 24,
  };

  it("leaves super off overtime, at both rates", () => {
    expect(onCostPctFor(priced, "ordinary")).toBe(23.45);
    expect(onCostPctFor(priced, "saturday")).toBe(23.45);
    expect(onCostPctFor(priced, "overtime")).toBe(11.45);
    expect(onCostPctFor(priced, "overtime_after")).toBe(11.45);
    // $48.09 an hour of overtime, plus 11.45% and 18%.
    expect(
      hourlyBillCents(
        cleaner,
        priced.billRule,
        onCostPctFor(priced, "overtime"),
        "overtime",
      ),
    ).toBe(6324);
    expect(
      hourlyBillCents(
        cleaner,
        priced.billRule,
        onCostPctFor(priced, "ordinary"),
        "ordinary",
      ),
    ).toBe(5004);
  });

  it("works out the on-costs without super on the overtime hours", () => {
    const cost = costShift(tenHours, priced);
    const overtimePay = cost.lines
      .filter((line) => line.type.startsWith("overtime"))
      .reduce((sum, line) => sum + line.payCents, 0);
    expect(cost.onCostCents).toBe(
      percentOf(cost.payCents, 23.45) - percentOf(overtimePay, 12),
    );
    const overtime = cost.lines.find((line) => line.type === "overtime")!;
    expect(overtime.billRateCents).toBe(6324);
  });

  it("follows the card where its award makes weekends overtime", () => {
    const weekendsOvertime: CostRules = {
      ...priced,
      card: {
        ...cleaner,
        superFreeTypes: ["overtime", "overtime_after", "saturday", "sunday"],
      },
    };
    expect(onCostPctFor(weekendsOvertime, "saturday")).toBe(11.45);
    expect(onCostPctFor(weekendsOvertime, "sunday")).toBe(11.45);
    expect(onCostPctFor(weekendsOvertime, "public_holiday")).toBe(23.45);
    // A card that lists nothing charges super on every hour.
    expect(
      onCostPctFor(
        { ...priced, card: { ...cleaner, superFreeTypes: [] } },
        "overtime",
      ),
    ).toBe(23.45);
  });

  it("keeps super on every hour for bookings priced before", () => {
    const before: CostRules = { ...costRules, card: cleaner };
    expect(onCostPctFor(before, "overtime")).toBe(23.45);
    const cost = costShift(tenHours, before);
    expect(cost.onCostCents).toBe(percentOf(cost.payCents, 23.45));
    expect(
      cost.lines.find((line) => line.type === "overtime")!.billRateCents,
    ).toBe(7005);
  });
});

describe("allowances (owner, 03/11/2026)", () => {
  const fares = {
    name: "Fares and travel allowance",
    when: "each_shift" as const,
    afterMinutes: 0,
    payCents: 2241,
    billCents: allowanceBillCents(2241, 23.45, 12, 18),
  };
  const meal = {
    name: "Meal allowance",
    when: "late_overtime" as const,
    afterMinutes: 120,
    payCents: 1753,
    billCents: allowanceBillCents(1753, 23.45, 12, 18),
  };
  const rules: CostRules = {
    ...costRules,
    card: cleaner,
    superPct: 12,
    allowances: [fares, meal],
  };
  const eightHours: MinutesByType = { ...emptyMinutes(), ordinary: 480 };

  it("are charged with on-costs but no super, and the margin", () => {
    // $22.41, plus 11.45% and 18%.
    expect(allowanceBillCents(2241, 23.45, 12, 18)).toBe(2947);
  });

  it("are paid on every shift worked, and added to the pay and charge", () => {
    const without = costShift(eightHours, { ...rules, allowances: [] });
    const cost = costShift(eightHours, rules);
    expect(cost.allowances).toEqual([
      { name: "Fares and travel allowance", payCents: 2241, billCents: 2947 },
    ]);
    expect(cost.payCents).toBe(without.payCents + 2241);
    expect(cost.billCents).toBe(without.billCents + 2947);
    expect(cost.onCostCents).toBe(
      percentOf(cost.payCents, 23.45) - percentOf(2241, 12),
    );
  });

  it("for late overtime, once it's more than the hours set", () => {
    const names = (late: number) =>
      (
        costShift(eightHours, rules, { lateOvertimeMinutes: late })
          .allowances ?? []
      ).map((a) => a.name);
    expect(names(0)).toEqual(["Fares and travel allowance"]);
    expect(names(120)).toEqual(["Fares and travel allowance"]);
    expect(names(121)).toEqual([
      "Fares and travel allowance",
      "Meal allowance",
    ]);
  });

  it("aren't paid on a shift with no hours, or kept from before", () => {
    expect(
      costShift(emptyMinutes(), { ...rules, minEngagementMinutes: 0 })
        .allowances,
    ).toEqual([]);
    expect(costShift(eightHours, costRules).allowances).toEqual([]);
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

  it("bills award rate types at their own fixed rate, or the closest one", () => {
    const fixed = billRuleFromRow(
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
        fixed_overtime_after_cents: 9500,
      },
      18,
    );
    expect(hourlyBillCents(cleaner, fixed, 0, "overtime_after")).toBe(9500);
    expect(hourlyBillCents(cleaner, fixed, 0, "saturday_after")).toBe(7000);
    expect(hourlyBillCents(cleaner, fixed, 0, "early_late")).toBe(6200);
    expect(hourlyBillCents(cleaner, fixed, 0, "night_shift")).toBe(6200);
  });
});

describe("a worker's other hours with us count towards overtime", () => {
  const weekly: HoursRules = { ...rules, weeklyOvertimeAfterMinutes: 38 * 60 };
  const splitWith = (
    card: RateCard | undefined,
    start: string,
    end: string,
    prior: { dayMinutes: number; weekOrdinaryMinutes: number },
  ) =>
    splitShift(
      { start: sydney(start), end: sydney(end), breakMinutes: 0 },
      weekly,
      card,
      prior,
    );

  it("puts a later-booked shift into overtime after the day's limit", () => {
    // 6 hours booked earlier that day, then Wednesday 1 pm to 5 pm.
    expect(
      splitWith(cleaner, "2026-11-04T13:00", "2026-11-04T17:00", {
        dayMinutes: 360,
        weekOrdinaryMinutes: 360,
      }),
    ).toEqual(minutes({ ordinary: 96, overtime: 120, overtime_after: 24 }));
  });

  it("counts overtime earlier in the day towards the later overtime rate", () => {
    // 10 hours earlier that day: 2.4 of them overtime already.
    expect(
      splitWith(cleaner, "2026-11-04T19:00", "2026-11-04T21:00", {
        dayMinutes: 600,
        weekOrdinaryMinutes: 456,
      }),
    ).toEqual(minutes({ overtime_after: 120 }));
  });

  it("puts hours past 38 ordinary hours in the week into overtime", () => {
    expect(
      splitWith(cleaner, "2026-11-04T09:00", "2026-11-04T13:00", {
        dayMinutes: 0,
        weekOrdinaryMinutes: 2200,
      }),
    ).toEqual(minutes({ ordinary: 80, overtime: 120, overtime_after: 40 }));
  });

  it("still pays Sunday's rate when it's higher than overtime", () => {
    expect(
      splitWith(cleaner, "2026-11-08T09:00", "2026-11-08T13:00", {
        dayMinutes: 456,
        weekOrdinaryMinutes: 456,
      }),
    ).toEqual(minutes({ sunday: 240 }));
  });

  it("counts them with rates kept before award rules too", () => {
    expect(
      splitWith(undefined, "2026-11-04T13:00", "2026-11-04T17:00", {
        dayMinutes: 360,
        weekOrdinaryMinutes: 360,
      }),
    ).toEqual(minutes({ ordinary: 96, overtime: 144 }));
  });

  it("changes nothing for a shift with no other hours", () => {
    expect(
      splitWith(cleaner, "2026-11-04T09:00", "2026-11-04T13:00", {
        dayMinutes: 0,
        weekOrdinaryMinutes: 0,
      }),
    ).toEqual(minutes({ ordinary: 240 }));
  });
});
