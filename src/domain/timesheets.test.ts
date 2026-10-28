import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import { emptyMinutes, type CostRules, type HoursRules } from "./pay";
import {
  costTimesheet,
  enteredHours,
  isLateArrival,
  isPayable,
  timesheetMinutes,
  workedMinutes,
} from "./timesheets";

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

describe("timesheet hours", () => {
  it("counts whole minutes from start to finish, less the break", () => {
    expect(
      workedMinutes({
        start: new Date("2026-11-04T20:02:37Z"),
        finish: new Date("2026-11-05T04:30:10Z"),
        breakMinutes: 30,
      }),
    ).toBe(477);
  });

  it("never counts below nothing", () => {
    const at = sydney("2026-11-04T07:00");
    expect(workedMinutes({ start: at, finish: at, breakMinutes: 0 })).toBe(0);
  });

  it("splits the hours by rate type", () => {
    expect(
      timesheetMinutes(
        {
          start: sydney("2026-11-04T07:00"),
          finish: sydney("2026-11-04T15:30"),
          breakMinutes: 30,
        },
        hoursRules,
      ),
    ).toEqual({ ...emptyMinutes(), ordinary: 456, overtime: 24 });
  });

  it("has no hours when they clocked in and straight out", () => {
    const at = sydney("2026-11-04T07:00");
    expect(
      timesheetMinutes({ start: at, finish: at, breakMinutes: 0 }, hoursRules),
    ).toEqual(emptyMinutes());
  });
});

describe("costing a timesheet", () => {
  it("pays and bills the hours with the booking's rates", () => {
    const { minutes, cost } = costTimesheet(
      {
        start: sydney("2026-11-04T07:00"),
        finish: sydney("2026-11-04T11:00"),
        breakMinutes: 0,
      },
      hoursRules,
      costRules,
    );
    expect(minutes.ordinary).toBe(240);
    // $37.50 an hour for 4 hours.
    expect(cost.payCents).toBe(15_000);
    expect(cost.paidMinutes).toBe(240);
  });

  it("tops short hours up to the minimum engagement", () => {
    const { cost } = costTimesheet(
      {
        start: sydney("2026-11-04T07:00"),
        finish: sydney("2026-11-04T08:00"),
        breakMinutes: 0,
      },
      hoursRules,
      costRules,
    );
    expect(cost.workedMinutes).toBe(60);
    expect(cost.paidMinutes).toBe(180);
    expect(cost.payCents).toBe(11_250);
  });
});

describe("late arrivals", () => {
  const start = sydney("2026-11-04T07:00");
  it("allows the grace period", () => {
    expect(isLateArrival(sydney("2026-11-04T07:05"), start, 5)).toBe(false);
  });
  it("counts anything after it as late", () => {
    expect(isLateArrival(sydney("2026-11-04T07:06"), start, 5)).toBe(true);
  });
  it("never counts an early start", () => {
    expect(isLateArrival(sydney("2026-11-04T06:45"), start, 0)).toBe(false);
  });
});

describe("payable timesheets", () => {
  it("pays approved hours, however they were approved", () => {
    expect(isPayable("approved")).toBe(true);
    expect(isPayable("auto_approved")).toBe(true);
    expect(isPayable("adjusted")).toBe(true);
  });
  it("waits on anything still being decided, and never pays rejected hours", () => {
    expect(isPayable("submitted")).toBe(false);
    expect(isPayable("disputed")).toBe(false);
    expect(isPayable("rejected")).toBe(false);
  });
});

describe("hours typed on a form", () => {
  it("reads the times on the shift's day", () => {
    expect(
      enteredHours(
        {
          date: "2026-11-04",
          start: "07:00",
          finish: "15:30",
          breakMinutes: 30,
        },
        SYDNEY,
      ),
    ).toEqual({
      start: sydney("2026-11-04T07:00"),
      finish: sydney("2026-11-04T15:30"),
      breakMinutes: 30,
    });
  });

  it("takes a finish before the start as the next morning", () => {
    expect(
      enteredHours(
        {
          date: "2026-11-06",
          start: "22:00",
          finish: "06:00",
          breakMinutes: 0,
        },
        SYDNEY,
      ),
    ).toEqual({
      start: sydney("2026-11-06T22:00"),
      finish: sydney("2026-11-07T06:00"),
      breakMinutes: 0,
    });
  });

  it("handles the night the clocks go back", () => {
    // Daylight saving ends at 3:00 am on Sunday 4 April 2027: this night
    // is an hour longer than it looks.
    const result = enteredHours(
      { date: "2027-04-03", start: "22:00", finish: "06:00", breakMinutes: 0 },
      SYDNEY,
    );
    expect("start" in result && workedMinutes(result)).toBe(9 * 60);
  });

  it("refuses a break as long as the hours", () => {
    expect(
      enteredHours(
        {
          date: "2026-11-04",
          start: "07:00",
          finish: "07:30",
          breakMinutes: 30,
        },
        SYDNEY,
      ),
    ).toEqual({ problem: "The break must be shorter than the time worked." });
  });

  it("refuses times that aren't times", () => {
    expect(
      enteredHours(
        { date: "2026-11-04", start: "7am", finish: "15:30", breakMinutes: 0 },
        SYDNEY,
      ),
    ).toEqual({ problem: "Enter the start and finish times." });
  });
});
