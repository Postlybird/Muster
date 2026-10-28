import { describe, expect, it } from "vitest";

import { pickOutcome, shiftsLabel, takeOutcome } from "./bookings";

describe("taking work", () => {
  it("counts shifts in plain words", () => {
    expect(shiftsLabel(1)).toBe("1 shift");
    expect(shiftsLabel(5)).toBe("5 shifts");
  });

  it("confirms an application", () => {
    expect(takeOutcome("pick", ["applied", "applied"])).toEqual({
      ok: true,
      message: "Applied for 2 shifts. We'll text you if you're picked.",
    });
  });

  it("confirms a booking, and says which shifts didn't go through", () => {
    expect(takeOutcome("auto", ["booked", "full", "clash"])).toEqual({
      ok: true,
      message:
        "You're booked on 1 shift. 1 shift had already filled up. 1 shift clashes with a shift you're already booked on.",
    });
  });

  it("fails when nothing went through", () => {
    expect(takeOutcome("auto", ["full", "full"])).toEqual({
      ok: false,
      message: "2 shifts had already filled up.",
    });
    expect(takeOutcome("pick", ["not_offered"])).toEqual({
      ok: false,
      message:
        "You can't take 1 shift any more. Check your tickets and availability.",
    });
    expect(takeOutcome("pick", [])).toEqual({
      ok: false,
      message: "We couldn't apply for those shifts.",
    });
  });

  it("tells the business what picking someone did", () => {
    expect(
      pickOutcome("Liam O.", ["booked", "booked", "not_eligible"]),
    ).toEqual({
      ok: true,
      message:
        "Booked Liam O. for 2 shifts. They can't take 1 shift any more, as their tickets or availability changed.",
    });
    expect(pickOutcome("Liam O.", [])).toEqual({
      ok: false,
      message: "Liam O. has no shifts left to book.",
    });
    expect(pickOutcome("Liam O.", ["not_ready", "not_ready"]).message).toBe(
      "2 shifts aren't ready yet. Try again in a minute.",
    );
  });
});
