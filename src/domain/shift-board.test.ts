import { describe, expect, it } from "vitest";

import { boardGroup, needsAttention } from "./shift-board";

describe("the shift board", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  const inHours = (hours: number) =>
    new Date(now.getTime() + hours * 3_600_000);

  it("groups shifts under way, needing workers, and filled", () => {
    expect(
      boardGroup({ startsAt: inHours(-1), headcount: 2, booked: 1 }, now),
    ).toBe("in_progress");
    expect(
      boardGroup({ startsAt: inHours(30), headcount: 2, booked: 1 }, now),
    ).toBe("needs_workers");
    expect(
      boardGroup({ startsAt: inHours(30), headcount: 2, booked: 2 }, now),
    ).toBe("filled");
  });

  it("flags shifts starting within 24 hours that aren't full", () => {
    expect(
      needsAttention({ startsAt: inHours(24), headcount: 2, booked: 1 }, now),
    ).toBe(true);
    expect(
      needsAttention({ startsAt: inHours(25), headcount: 2, booked: 1 }, now),
    ).toBe(false);
    expect(
      needsAttention({ startsAt: inHours(2), headcount: 2, booked: 2 }, now),
    ).toBe(false);
    // Once it has started, it's under way rather than unfilled.
    expect(
      needsAttention({ startsAt: inHours(-1), headcount: 2, booked: 1 }, now),
    ).toBe(false);
  });
});
