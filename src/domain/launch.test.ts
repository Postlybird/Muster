import { describe, expect, it } from "vitest";

import { launchWords } from "./launch";

describe("launchWords", () => {
  it("says when shifts start, in the admin's words", () => {
    const words = launchWords("in early 2027");
    expect(words.banner).toBe(
      "Shifts start in early 2027. Sign up now and we'll email you when we open.",
    );
    expect(words.bannerShort).toBe(
      "Shifts start in early 2027. We'll email you.",
    );
    for (const text of Object.values(words)) {
      expect(text).toMatch(/^Shifts start in early 2027\. /);
    }
  });

  it("ignores stray spaces around the date", () => {
    expect(launchWords("  on 13 January ").banner).toMatch(
      /^Shifts start on 13 January\. Sign up/,
    );
  });

  it("keeps the phone version short", () => {
    expect(launchWords("in early 2027").bannerShort.length).toBeLessThanOrEqual(
      45,
    );
  });
});
