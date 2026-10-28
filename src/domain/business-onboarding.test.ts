import { describe, expect, it } from "vitest";

import {
  missingBusinessSteps,
  nextBusinessStep,
  previousBusinessStep,
  resumeBusinessStep,
} from "./business-onboarding";

describe("business onboarding", () => {
  it("moves through the steps", () => {
    expect(nextBusinessStep("abn")).toBe("details");
    expect(nextBusinessStep("agreement")).toBe("submit");
    expect(previousBusinessStep("abn")).toBeNull();
    expect(previousBusinessStep("sites")).toBe("details");
  });

  it("resumes at the first unfinished step", () => {
    expect(resumeBusinessStep([])).toBe("abn");
    expect(resumeBusinessStep(["abn", "details"])).toBe("sites");
    expect(
      resumeBusinessStep(["abn", "details", "sites", "team", "agreement"]),
    ).toBe("submit");
  });

  it("lists what's missing before submitting", () => {
    expect(
      missingBusinessSteps({
        abnActive: true,
        billingContactName: "Pat",
        accountsEmail: "accounts@example.test",
        siteCount: 1,
        agreementAccepted: true,
      }),
    ).toEqual([]);
    expect(
      missingBusinessSteps({
        abnActive: false,
        billingContactName: null,
        accountsEmail: "accounts@example.test",
        siteCount: 0,
        agreementAccepted: false,
      }),
    ).toEqual(["abn", "details", "sites", "agreement"]);
  });
});
