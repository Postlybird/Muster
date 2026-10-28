import { describe, expect, it } from "vitest";

import { SITE_TAGS } from "@/domain/ratings";

import { ratingFromForm } from "./ratings";

function form(values: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of values) data.append(key, value);
  return data;
}

describe("the rating form", () => {
  it("reads the stars, the tags on offer and the note", () => {
    expect(
      ratingFromForm(
        form([
          ["score", "4"],
          ["tag", "safe_site"],
          ["tag", "free_lunch"],
          ["note", " Lift was out "],
        ]),
        SITE_TAGS,
      ),
    ).toEqual({
      ok: true,
      score: 4,
      tags: ["safe_site"],
      note: "Lift was out",
    });
  });

  it("needs the stars", () => {
    const result = ratingFromForm(form([["tag", "safe_site"]]), SITE_TAGS);
    expect(!result.ok && result.state).toMatchObject({
      fieldErrors: { score: ["Choose 1 to 5 stars"] },
    });
  });
});
