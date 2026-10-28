import { describe, expect, it } from "vitest";

import { outcomeOf, reliabilityScore, type ShiftOutcome } from "./reliability";

const rules = { window: 20, lateCancelCredit: 50, lateArrivalCredit: 75 };

describe("reliability", () => {
  it("is new until there's something to count", () => {
    expect(reliabilityScore([], rules)).toBeNull();
  });

  it("is 100% for every shift worked", () => {
    expect(reliabilityScore(["worked", "worked"], rules)).toBe(100);
  });

  it("counts late cancellations, late arrivals and no-shows", () => {
    expect(
      reliabilityScore(
        ["worked", "late_cancellation", "late_arrival", "no_show"],
        rules,
      ),
    ).toBe(56.3); // (100 + 50 + 75 + 0) / 4 = 56.25
  });

  it("only looks at the most recent shifts", () => {
    const outcomes: ShiftOutcome[] = [
      ...Array<ShiftOutcome>(20).fill("worked"),
      "no_show",
    ];
    expect(reliabilityScore(outcomes, rules)).toBe(100);
    expect(reliabilityScore(outcomes, { ...rules, window: 21 })).toBe(95.2);
  });

  it("knows what each booking counts as", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const past = new Date("2026-11-09T00:00:00Z");
    const future = new Date("2026-11-11T00:00:00Z");
    const base = { lateCancellation: false, endsAt: past };
    expect(outcomeOf({ ...base, status: "confirmed" }, now)).toBe("worked");
    expect(
      outcomeOf({ ...base, status: "confirmed", endsAt: future }, now),
    ).toBeNull();
    expect(
      outcomeOf({ ...base, status: "completed", lateArrival: true }, now),
    ).toBe("late_arrival");
    expect(outcomeOf({ ...base, status: "no_show" }, now)).toBe("no_show");
    expect(
      outcomeOf(
        { ...base, status: "cancelled_by_worker", lateCancellation: true },
        now,
      ),
    ).toBe("late_cancellation");
    // Cancelling in good time, or the business cancelling, doesn't count.
    expect(
      outcomeOf({ ...base, status: "cancelled_by_worker" }, now),
    ).toBeNull();
    expect(
      outcomeOf(
        { ...base, status: "cancelled_by_business", lateCancellation: true },
        now,
      ),
    ).toBeNull();
  });
});
