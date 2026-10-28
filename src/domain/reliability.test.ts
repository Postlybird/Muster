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
    const base = { lateCancellation: false, worked: false, lateArrival: false };
    expect(outcomeOf({ ...base, status: "confirmed", worked: true })).toBe(
      "worked",
    );
    // Still to come, or their hours aren't in yet.
    expect(outcomeOf({ ...base, status: "confirmed" })).toBeNull();
    expect(
      outcomeOf({
        ...base,
        status: "confirmed",
        worked: true,
        lateArrival: true,
      }),
    ).toBe("late_arrival");
    expect(outcomeOf({ ...base, status: "no_show" })).toBe("no_show");
    expect(
      outcomeOf({
        ...base,
        status: "cancelled_by_worker",
        lateCancellation: true,
      }),
    ).toBe("late_cancellation");
    // Cancelling in good time, or the business cancelling, doesn't count.
    expect(outcomeOf({ ...base, status: "cancelled_by_worker" })).toBeNull();
    expect(
      outcomeOf({
        ...base,
        status: "cancelled_by_business",
        lateCancellation: true,
      }),
    ).toBeNull();
  });
});
