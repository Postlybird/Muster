import { describe, expect, it } from "vitest";

import { launchWords } from "./launch";

describe("launchWords", () => {
  it("says when shifts start, in the admin's words", () => {
    const words = launchWords("in early 2027");
    expect(words.start).toBe("Shifts start in early 2027.");
    expect(words.banner).toBe(
      "Shifts start in early 2027. Sign up now and we'll let you know when we open.",
    );
    expect(words.bannerShort).toBe("Shifts start in early 2027. Sign up now.");
    for (const text of Object.values(words)) {
      expect(text).toMatch(/^Shifts start in early 2027\.( |$)/);
    }
  });

  it("tells a worker who has just signed up what happens next", () => {
    expect(launchWords("in early 2027").workerSignedUp).toBe(
      "Shifts start in early 2027. We'll let you know as soon as you can apply for shifts. Until then, add your details below when you're ready, and we'll check them.",
    );
  });

  it("promises workers word by app notification or email, and businesses an email", () => {
    const words = launchWords("in early 2027");
    for (const text of [
      words.banner,
      words.signUp,
      words.workerSignedUp,
      words.workerWaiting,
      words.workerNext,
    ]) {
      expect(text).not.toMatch(/email/);
    }
    expect(words.business).toMatch(/we'll email you/);
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
