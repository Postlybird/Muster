import { describe, expect, it } from "vitest";

import { cleanTags, ratingSummary, SITE_TAGS, WORKER_TAGS } from "./ratings";

describe("ratings", () => {
  it("summarises an average for people to read", () => {
    expect(ratingSummary(4.6667, 3)).toBe("4.7 stars from 3 ratings");
    expect(ratingSummary(5, 1)).toBe("5.0 stars from 1 rating");
  });

  it("says when there's nothing yet", () => {
    expect(ratingSummary(null, 0)).toBe("No ratings yet");
  });

  it("keeps only the tags on offer, once each", () => {
    expect(
      cleanTags(["punctual", "punctual", "free_lunch", "skilled"], WORKER_TAGS),
    ).toEqual(["punctual", "skilled"]);
    expect(cleanTags(["punctual"], SITE_TAGS)).toEqual([]);
  });

  it("offers the tags the database accepts", () => {
    // Keep these in step with rate_worker() and rate_site().
    expect(Object.keys(WORKER_TAGS)).toEqual([
      "punctual",
      "hard_working",
      "would_rehire",
      "careful",
      "great_attitude",
      "skilled",
    ]);
    expect(Object.keys(SITE_TAGS)).toEqual([
      "safe_site",
      "well_organised",
      "clear_instructions",
      "friendly_team",
      "good_facilities",
    ]);
  });
});
