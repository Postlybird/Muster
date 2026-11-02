import { describe, expect, it } from "vitest";

import {
  NO_PRIOR_HOURS,
  overtimeFromOtherShifts,
  overtimeFromOtherShiftsMinutes,
  priorHours,
  weekStart,
  workedMinutes,
  type BookedHours,
} from "./overtime";

const DAY = 456; // 7.6 hours
const limits = { dailyMinutes: DAY, weeklyMinutes: 38 * 60 };

/** Wednesday 4 November 2026, and other days that week. */
const booked = (
  shiftId: string,
  day: string,
  hours: number,
  bookedAt = "2026-11-01T00:00:00Z",
): BookedHours => ({ shiftId, bookedAt, day, minutes: hours * 60 });

describe("weekStart", () => {
  it("is the Monday of the date's week", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02"); // Wednesday
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });
});

describe("workedMinutes", () => {
  it("is the shift less its unpaid break, never below zero", () => {
    expect(
      workedMinutes(
        new Date("2026-11-04T07:00:00+11:00"),
        new Date("2026-11-04T15:30:00+11:00"),
        30,
      ),
    ).toBe(480);
    expect(
      workedMinutes(
        new Date("2026-11-04T07:00:00+11:00"),
        new Date("2026-11-04T07:10:00+11:00"),
        30,
      ),
    ).toBe(0);
  });
});

describe("priorHours", () => {
  it("counts the worker's other hours that day and week, a day at most up to its limit", () => {
    const prior = priorHours(
      { shiftId: "new", bookedAt: null, day: "2026-11-04" },
      [
        booked("a", "2026-11-04", 6),
        booked("b", "2026-11-02", 10), // Monday, 2.4 h past the limit
        booked("c", "2026-11-09", 8), // next week
      ],
      DAY,
    );
    expect(prior).toEqual({ dayMinutes: 360, weekOrdinaryMinutes: 360 + DAY });
  });

  it("only counts shifts booked before this one", () => {
    const target = {
      shiftId: "mine",
      bookedAt: "2026-11-01T10:00:00Z",
      day: "2026-11-04",
    };
    const prior = priorHours(
      target,
      [
        booked("earlier", "2026-11-04", 6, "2026-11-01T09:00:00Z"),
        booked("later", "2026-11-04", 4, "2026-11-01T11:00:00Z"),
        booked("mine", "2026-11-04", 4, target.bookedAt),
      ],
      DAY,
    );
    expect(prior.dayMinutes).toBe(360);
  });

  it("breaks a tie in booking time by shift, so two bookings never both count first", () => {
    const at = "2026-11-01T09:00:00Z";
    const bookings = [
      booked("a", "2026-11-04", 6, at),
      booked("b", "2026-11-04", 4, at),
    ];
    const forA = priorHours(
      { shiftId: "a", bookedAt: at, day: "2026-11-04" },
      bookings,
      DAY,
    );
    const forB = priorHours(
      { shiftId: "b", bookedAt: at, day: "2026-11-04" },
      bookings,
      DAY,
    );
    expect([forA.dayMinutes, forB.dayMinutes]).toEqual([0, 360]);
  });
});

describe("overtimeFromOtherShifts", () => {
  it("is false with no other hours, even for a shift long enough for overtime of its own", () => {
    expect(overtimeFromOtherShifts(NO_PRIOR_HOURS, 600, limits)).toBe(false);
  });

  it("is true when the day's hours pass the daily limit", () => {
    const prior = { dayMinutes: 360, weekOrdinaryMinutes: 360 };
    expect(overtimeFromOtherShifts(prior, 240, limits)).toBe(true); // 10 h
    expect(overtimeFromOtherShifts(prior, 96, limits)).toBe(false); // exactly 7.6 h
  });

  it("is true when the week's ordinary hours pass the weekly limit", () => {
    // Four full days already: 30.4 ordinary hours, so a fifth makes 38.
    const four = { dayMinutes: 0, weekOrdinaryMinutes: 4 * DAY };
    expect(overtimeFromOtherShifts(four, DAY, limits)).toBe(false);
    // Hours past the daily limit are overtime already, not counted twice.
    expect(overtimeFromOtherShifts(four, 8 * 60, limits)).toBe(false);
    // Five full days: a sixth day's shift is past the weekly limit.
    const five = { dayMinutes: 0, weekOrdinaryMinutes: 5 * DAY };
    expect(overtimeFromOtherShifts(five, 4 * 60, limits)).toBe(true);
  });
});

describe("overtimeFromOtherShiftsMinutes", () => {
  it("counts the minutes past the daily limit that the other hours cause", () => {
    expect(
      overtimeFromOtherShiftsMinutes(
        { dayMinutes: 360, weekOrdinaryMinutes: 360 },
        240,
        limits,
      ),
    ).toEqual({ minutes: 144, reason: "day" });
  });

  it("leaves out overtime the shift has on its own", () => {
    // 10 hours alone is 2.4 hours over; an hour before makes it 3.4.
    expect(
      overtimeFromOtherShiftsMinutes(
        { dayMinutes: 60, weekOrdinaryMinutes: 60 },
        600,
        limits,
      ),
    ).toEqual({ minutes: 60, reason: "day" });
  });

  it("counts the minutes past the weekly limit", () => {
    expect(
      overtimeFromOtherShiftsMinutes(
        { dayMinutes: 0, weekOrdinaryMinutes: 2200 },
        240,
        limits,
      ),
    ).toEqual({ minutes: 160, reason: "week" });
  });

  it("is none with no other hours", () => {
    expect(overtimeFromOtherShiftsMinutes(NO_PRIOR_HOURS, 600, limits)).toEqual(
      { minutes: 0, reason: "day" },
    );
  });
});
