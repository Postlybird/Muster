import { describe, expect, it } from "vitest";

import {
  hourlyPayCents,
  hourlyPayTable,
  pickBillRule,
  pickRateCard,
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

describe("choosing the rate card for a shift", () => {
  const card = (
    id: string,
    business_id: string | null,
    level: number,
    effective_from: string,
    effective_to: string | null = null,
  ) => ({
    id,
    business_id,
    category_id: "cleaner",
    level,
    effective_from,
    effective_to,
  });
  const cards = [
    card("standard-jan", null, 1, "2026-01-01"),
    card("standard-jul", null, 1, "2026-07-01"),
    card("host-b", "b", 1, "2026-09-01", "2026-12-31"),
    card("standard-level-2", null, 2, "2026-01-01"),
  ];
  const pick = (businessId: string, date: string, level = 1) =>
    pickRateCard(cards, { businessId, categoryId: "cleaner", level, date })
      ?.id ?? null;

  it("uses the latest standard card in effect", () => {
    expect(pick("a", "2026-03-01")).toBe("standard-jan");
    expect(pick("a", "2026-08-01")).toBe("standard-jul");
  });

  it("uses the business's own card while it's in effect", () => {
    expect(pick("b", "2026-10-01")).toBe("host-b");
    expect(pick("b", "2027-01-05")).toBe("standard-jul");
  });

  it("finds nothing for a level or date without a card", () => {
    expect(pick("a", "2026-08-01", 3)).toBeNull();
    expect(pick("a", "2025-12-31")).toBeNull();
    expect(pick("a", "2026-08-01", 2)).toBe("standard-level-2");
  });
});

describe("choosing the bill rule for a shift", () => {
  const rule = (
    id: string,
    business_id: string | null,
    category_id: string | null,
    effective_from: string,
    effective_to: string | null = null,
  ) => ({ id, business_id, category_id, effective_from, effective_to });
  const rules = [
    rule("category", null, "cleaner", "2026-01-01"),
    rule("business-all", "b", null, "2026-01-01"),
    rule("business-cleaner", "b", "cleaner", "2026-06-01"),
    rule("business-cleaner-spring", "b", "cleaner", "2026-09-01", "2026-10-31"),
  ];
  const pick = (businessId: string, categoryId: string, date: string) =>
    pickBillRule(rules, { businessId, categoryId, date })?.id ?? null;

  it("prefers the most specific rule in effect", () => {
    expect(pick("a", "cleaner", "2026-05-01")).toBe("category");
    expect(pick("b", "cleaner", "2026-05-01")).toBe("business-all");
    expect(pick("b", "cleaner", "2026-07-01")).toBe("business-cleaner");
    expect(pick("b", "labourer", "2026-07-01")).toBe("business-all");
  });

  it("takes the latest start date, and drops rules that have ended", () => {
    expect(pick("b", "cleaner", "2026-10-15")).toBe("business-cleaner-spring");
    expect(pick("b", "cleaner", "2026-11-15")).toBe("business-cleaner");
  });

  it("falls back to the default margin when nothing applies", () => {
    expect(pick("a", "labourer", "2026-07-01")).toBeNull();
  });
});
