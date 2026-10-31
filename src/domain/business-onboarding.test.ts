import { describe, expect, it } from "vitest";

import { missingBusinessSteps } from "./business-onboarding";

describe("business sign-up", () => {
  it("is ready once the ABN, billing contact and agreement are in", () => {
    expect(
      missingBusinessSteps({
        abnActive: true,
        billingContactName: "Pat",
        accountsEmail: "accounts@example.test",
        agreementAccepted: true,
      }),
    ).toEqual([]);
  });

  it("lists what's missing, and doesn't need a site", () => {
    expect(
      missingBusinessSteps({
        abnActive: false,
        billingContactName: null,
        accountsEmail: "accounts@example.test",
        agreementAccepted: false,
      }),
    ).toEqual(["abn", "details", "agreement"]);
  });
});
