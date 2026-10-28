import { describe, expect, it } from "vitest";

import {
  availableNowUntil,
  formatTimeOfDay,
  isAvailableNow,
  isOvernight,
  normaliseTime,
  summariseWeekly,
  windowProblem,
} from "./availability";

describe("times", () => {
  it("accepts 24-hour times from forms and the database", () => {
    expect(normaliseTime("07:00")).toBe("07:00");
    expect(normaliseTime("07:00:00")).toBe("07:00");
    expect(normaliseTime("24:00")).toBeNull();
    expect(normaliseTime("7am")).toBeNull();
    expect(normaliseTime(null)).toBeNull();
  });

  it("shows times in plain 12-hour style", () => {
    expect(formatTimeOfDay("07:00")).toBe("7:00 am");
    expect(formatTimeOfDay("13:30")).toBe("1:30 pm");
    expect(formatTimeOfDay("00:00")).toBe("12:00 am");
    expect(formatTimeOfDay("12:15")).toBe("12:15 pm");
  });

  it("allows windows that run past midnight", () => {
    expect(isOvernight("22:00", "06:00")).toBe(true);
    expect(isOvernight("06:00", "22:00")).toBe(false);
    expect(windowProblem("22:00", "06:00")).toBeNull();
  });

  it("needs two different times", () => {
    expect(windowProblem("07:00", "07:00")).toMatch(/same/);
    expect(windowProblem(null, "07:00")).toMatch(/Enter/);
  });
});

describe("weekly summary", () => {
  it("groups runs of days with the same hours", () => {
    expect(
      summariseWeekly(
        [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          start: "07:00",
          end: "17:00",
        })),
      ),
    ).toBe("Mon–Fri, 7:00 am to 5:00 pm");
  });

  it("lists separate days and overnight windows", () => {
    expect(
      summariseWeekly([
        { weekday: 1, start: "08:00", end: "16:00" },
        { weekday: 3, start: "08:00", end: "16:00" },
        { weekday: 6, start: "22:00", end: "06:00" },
      ]),
    ).toBe(
      "Mon, 8:00 am to 4:00 pm; Wed, 8:00 am to 4:00 pm; Sat, 10:00 pm to 6:00 am (next day)",
    );
  });

  it("says when nothing is set", () => {
    expect(summariseWeekly([])).toBe("No regular days set");
  });
});

describe("available now", () => {
  const now = new Date("2026-10-28T01:00:00Z");

  it("lasts a few hours from when it's switched on", () => {
    const until = availableNowUntil(now);
    expect(until.toISOString()).toBe("2026-10-28T05:00:00.000Z");
    expect(isAvailableNow(until.toISOString(), now)).toBe(true);
    expect(isAvailableNow(until.toISOString(), until)).toBe(false);
    expect(isAvailableNow(null, now)).toBe(false);
  });
});
