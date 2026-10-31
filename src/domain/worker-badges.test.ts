import { describe, expect, it } from "vitest";

import { workerBadges, type BadgeFacts } from "./worker-badges";

const facts = (more: Partial<BadgeFacts> = {}): BadgeFacts => ({
  rating: null,
  ratingCount: 0,
  reliability: null,
  shiftsCompleted: 0,
  shiftsHere: 0,
  favourite: false,
  ...more,
});

const keys = (more: Partial<BadgeFacts>) =>
  workerBadges(facts(more)).map((badge) => badge.key);

describe("workerBadges", () => {
  it("calls someone with no history new", () => {
    expect(keys({})).toEqual(["new"]);
    expect(keys({ shiftsCompleted: 3 })).toEqual([]);
  });

  it("is top rated only with enough ratings", () => {
    expect(keys({ rating: 4.8, ratingCount: 5, shiftsCompleted: 5 })).toEqual([
      "top_rated",
    ]);
    expect(keys({ rating: 5, ratingCount: 4, shiftsCompleted: 5 })).toEqual([]);
    expect(keys({ rating: 4.6, ratingCount: 20, shiftsCompleted: 20 })).toEqual(
      [],
    );
  });

  it("is very reliable over at least 10 shifts", () => {
    expect(keys({ reliability: 96, shiftsCompleted: 10 })).toEqual([
      "very_reliable",
    ]);
    expect(keys({ reliability: 100, shiftsCompleted: 9 })).toEqual([]);
    expect(keys({ reliability: 94, shiftsCompleted: 30 })).toEqual([]);
  });

  it("puts this business's own history first", () => {
    expect(
      keys({
        favourite: true,
        shiftsHere: 3,
        rating: 4.9,
        ratingCount: 12,
        reliability: 98,
        shiftsCompleted: 25,
        yearsInWork: 6,
      }),
    ).toEqual([
      "favourite",
      "worked_here",
      "top_rated",
      "very_reliable",
      "experienced",
    ]);
  });

  it("counts shifts with this business in words", () => {
    const label = (shiftsHere: number) =>
      workerBadges(facts({ shiftsHere, shiftsCompleted: 5 }))[0]?.label;
    expect(label(1)).toBe("Worked with you once");
    expect(label(4)).toBe("Worked with you 4 times");
  });

  it("needs five years in the job's type of work for experienced", () => {
    expect(keys({ yearsInWork: 5, shiftsCompleted: 3 })).toEqual([
      "experienced",
    ]);
    expect(keys({ yearsInWork: 4, shiftsCompleted: 3 })).toEqual([]);
    expect(keys({ yearsInWork: null, shiftsCompleted: 3 })).toEqual([]);
  });
});
