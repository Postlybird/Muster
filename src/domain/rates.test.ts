import { describe, expect, it } from "vitest";

import {
  hourlyPayCents,
  hourlyPayTable,
  rateCardFromRow,
  type RateCard,
} from "./rates";

const card: RateCard = {
  baseRateCents: 2650,
  multipliers: {
    ordinary: 1.25,
    saturday: 1.75,
    sunday: 2.25,
    public_holiday: 2.75,
    overtime: 1.875,
    night: 1.4,
  },
};

describe("hourly pay", () => {
  it("multiplies the base rate (casual loading is in the multiplier)", () => {
    expect(hourlyPayCents(card, "saturday")).toBe(4638); // 26.50 × 1.75 = 46.375
    expect(hourlyPayCents(card, "sunday")).toBe(5963); // 59.625
    expect(hourlyPayCents(card, "public_holiday")).toBe(7288); // 72.875
  });

  it("rounds half a cent up", () => {
    expect(hourlyPayCents(card, "ordinary")).toBe(3313); // 33.125
    expect(hourlyPayCents(card, "overtime")).toBe(4969); // 49.6875
  });

  it("avoids floating-point drift", () => {
    // 1.15 can't be represented exactly in binary; 1000 × 1.15 must still be 1150.
    const tricky: RateCard = {
      ...card,
      baseRateCents: 1000,
      multipliers: { ...card.multipliers, night: 1.15 },
    };
    expect(hourlyPayCents(tricky, "night")).toBe(1150);
  });

  it("builds a table for every day type", () => {
    expect(hourlyPayTable(card)).toEqual({
      ordinary: 3313,
      saturday: 4638,
      sunday: 5963,
      public_holiday: 7288,
      overtime: 4969,
      night: 3710,
    });
  });

  it("reads numeric strings from the database", () => {
    const fromRow = rateCardFromRow({
      base_rate_cents: 2650,
      ordinary_multiplier: "1.250",
      saturday_multiplier: "1.750",
      sunday_multiplier: "2.250",
      public_holiday_multiplier: "2.750",
      overtime_multiplier: "1.875",
      night_multiplier: "1.400",
    });
    expect(fromRow).toEqual(card);
  });
});
