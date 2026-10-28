import { describe, expect, it } from "vitest";

import { customPeriod, durationLabel, percent, periodOf } from "./reports";

describe("report periods", () => {
  it("count back from today, both ends included", () => {
    expect(periodOf("last_7", "2026-10-28")).toEqual({
      from: "2026-10-22",
      to: "2026-10-28",
    });
    expect(periodOf("last_30", "2026-10-28")).toEqual({
      from: "2026-09-29",
      to: "2026-10-28",
    });
  });

  it("cover calendar months", () => {
    expect(periodOf("this_month", "2026-10-28")).toEqual({
      from: "2026-10-01",
      to: "2026-10-28",
    });
    expect(periodOf("last_month", "2026-03-05")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(periodOf("last_month", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("accept chosen dates in order, up to a year", () => {
    expect(customPeriod("2026-10-01", "2026-10-28")).toEqual({
      from: "2026-10-01",
      to: "2026-10-28",
    });
    expect(customPeriod("2026-10-28", "2026-10-01")).toBeNull();
    expect(customPeriod("2026-02-31", "2026-03-02")).toBeNull();
    expect(customPeriod("2025-01-01", "2025-12-31")).not.toBeNull();
    expect(customPeriod("2025-01-01", "2026-01-02")).toBeNull();
    expect(customPeriod("last week", "2026-10-28")).toBeNull();
  });
});

describe("report figures", () => {
  it("show shares as whole percentages", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 5)).toBe(0);
    expect(percent(0, 0)).toBeNull();
  });

  it("show durations in plain words", () => {
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(200)).toBe("3 h 20 min");
    expect(durationLabel(180)).toBe("3 h");
    expect(durationLabel(1440)).toBe("1 day");
    expect(durationLabel(3120)).toBe("2 days 4 h");
  });
});
