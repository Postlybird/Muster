import { describe, expect, it } from "vitest";

import { chosenOutcome, outcomesFor } from "./admin-flags";

describe("settling matters in the queues", () => {
  it("offers the decisions that suit each kind", () => {
    expect(outcomesFor("possible_no_show").map((c) => c.value)).toEqual([
      "arrived",
      "no_show",
    ]);
    expect(outcomesFor("booking_at_risk").map((c) => c.value)).toEqual([
      "remove",
      "keep",
    ]);
    expect(outcomesFor("safety").map((c) => c.value)).toEqual(["resolve"]);
  });

  it("only accepts a decision open for the kind", () => {
    expect(chosenOutcome("suspension", "lift")).toBe("lift");
    expect(chosenOutcome("no_show", "lift")).toBeUndefined();
    expect(chosenOutcome("no_show", "")).toBeUndefined();
    // With one choice there's nothing to pick.
    expect(chosenOutcome("outside_site", "")).toBe("resolve");
  });
});
