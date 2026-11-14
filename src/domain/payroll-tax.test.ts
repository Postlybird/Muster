import { describe, expect, it } from "vitest";

import { payrollTaxWarning } from "./payroll-tax";

const threshold = 120_000_000; // $1.2 million

describe("the payroll tax warning (owner, 14/11/2026)", () => {
  it("stays quiet well below the threshold", () => {
    expect(
      payrollTaxWarning({
        yearPayCents: 50_000_000,
        monthPayCents: 5_000_000,
        thresholdCents: threshold,
        superPct: 12,
      }),
    ).toBeNull();
  });

  it("counts super as wages, and warns at 80% of the year's threshold", () => {
    // $860,000 of pay is $963,200 with super: past 80% of $1.2 million.
    const warning = payrollTaxWarning({
      yearPayCents: 86_000_000,
      monthPayCents: 7_000_000,
      thresholdCents: threshold,
      superPct: 12,
    });
    expect(warning).toEqual({
      over: false,
      yearCents: 96_320_000,
      monthCents: 7_840_000,
      monthThresholdCents: 9_863_014,
    });
  });

  it("warns when one month nears its share, even early in the year", () => {
    expect(
      payrollTaxWarning({
        yearPayCents: 9_000_000,
        monthPayCents: 9_000_000,
        thresholdCents: threshold,
        superPct: 12,
      })?.over,
    ).toBe(true);
  });
});
