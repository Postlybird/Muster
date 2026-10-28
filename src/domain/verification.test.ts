import { describe, expect, it } from "vitest";

import {
  activationBlockers,
  hasWorkLimit,
  isBridgingVisa,
  nextVevoCheck,
  type ActivationState,
} from "./verification";

describe("activation", () => {
  const ready: ActivationState = {
    status: "pending",
    photoStatus: "verified",
    rightToWorkStatus: "verified",
    identityStatus: "verified",
    payrollStatus: "complete",
  };

  it("is allowed once every core check is done", () => {
    expect(activationBlockers(ready)).toEqual([]);
  });

  it("lists what's left", () => {
    expect(
      activationBlockers({
        ...ready,
        photoStatus: "pending",
        identityStatus: "rejected",
        payrollStatus: "invited",
      }),
    ).toEqual(["Photo", "Photo ID", "Payroll setup"]);
  });

  it("only applies to workers waiting for checks", () => {
    expect(activationBlockers({ ...ready, status: "active" })).toHaveLength(1);
    expect(activationBlockers({ ...ready, status: "draft" })).toHaveLength(1);
  });
});

describe("VEVO re-checks", () => {
  const base = { checkedOn: "2026-10-28", bridgingRecheckMonths: 3 };

  it("recognises bridging visas", () => {
    expect(isBridgingVisa("010")).toBe(true);
    expect(isBridgingVisa("050")).toBe(true);
    expect(isBridgingVisa("500")).toBe(false);
    expect(isBridgingVisa(null)).toBe(false);
  });

  it("re-checks at visa expiry", () => {
    expect(
      nextVevoCheck({
        ...base,
        basis: "visa",
        subclass: "500",
        visaExpiry: "2027-12-01",
      }),
    ).toBe("2027-12-01");
  });

  it("re-checks a bridging visa with no expiry every few months", () => {
    expect(
      nextVevoCheck({
        ...base,
        basis: "visa",
        subclass: "010",
        visaExpiry: null,
      }),
    ).toBe("2027-01-28");
  });

  it("doesn't re-check citizens or permanent visas", () => {
    expect(
      nextVevoCheck({
        ...base,
        basis: "citizen",
        subclass: null,
        visaExpiry: null,
      }),
    ).toBeNull();
    expect(
      nextVevoCheck({
        ...base,
        basis: "permanent_resident",
        subclass: "189",
        visaExpiry: null,
      }),
    ).toBeNull();
  });
});

describe("work limits", () => {
  it("flags conditions that limit hours", () => {
    expect(hasWorkLimit("8105: work limited to 48 hours per fortnight")).toBe(
      true,
    );
    expect(hasWorkLimit("Work limited to 40 hours a fortnight")).toBe(true);
    expect(hasWorkLimit("No work limitation")).toBe(false);
    expect(hasWorkLimit("8501: maintain health insurance")).toBe(false);
    expect(hasWorkLimit(null)).toBe(false);
  });
});
