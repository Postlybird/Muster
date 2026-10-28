import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import { makePricer, type PricingData } from "./pricing";

const card = {
  id: "standard",
  business_id: null,
  category_id: "cleaner",
  level: 1,
  base_rate_cents: 2650,
  ordinary_multiplier: "1.250",
  saturday_multiplier: "1.750",
  sunday_multiplier: "2.250",
  public_holiday_multiplier: "2.750",
  overtime_multiplier: "1.875",
  night_multiplier: "1.400",
  effective_from: "2026-01-01",
  effective_to: null,
};

const data: PricingData = {
  cards: [card],
  rules: [],
  publicHolidays: ["2026-12-25"],
  category: { min_engagement_hours: "4.00", workers_comp_pct: null },
  settings: {
    daily_overtime_after_hours: 7.6,
    night_hours: { start: "19:00", end: "06:00" },
    margin_pct: 18,
    on_costs_pct: {
      super: 12,
      workers_comp: 5,
      payroll_tax: 5.45,
      insurance: 1,
    },
    urgent_loading_pct: { pay: 10, bill: 20 },
    gst_pct: 10,
  },
};

const sydney = (local: string) =>
  fromZonedTime(`${local}:00`, "Australia/Sydney");
const pricer = makePricer(
  { businessId: "b", categoryId: "cleaner", level: 1, state: "NSW" },
  data,
);

describe("pricing shifts from loaded data", () => {
  it("prices a shift with the standard card and default margin", () => {
    const result = pricer.quote({
      start: sydney("2026-12-25T08:00"),
      end: sydney("2026-12-25T12:00"),
      breakMinutes: 0,
      urgent: false,
    });
    expect(result.ok && result.date).toBe("2026-12-25");
    expect(result.ok && result.minutes.public_holiday).toBe(240);
    expect(result.ok && result.billRule).toBeNull();
    expect(result.ok && result.cost.payCents).toBe(7288 * 4);
  });

  it("explains when there's no rate card", () => {
    const result = makePricer(
      { businessId: "b", categoryId: "cleaner", level: 3, state: "NSW" },
      data,
    ).quote({
      start: sydney("2026-11-04T08:00"),
      end: sydney("2026-11-04T12:00"),
      breakMinutes: 0,
      urgent: false,
    });
    expect(result).toEqual({
      ok: false,
      problem: expect.stringMatching(/no pay rate card .* level 3/),
    });
  });

  it("estimates a job: every shift times the number of workers", () => {
    const shift = (day: string) => ({
      start: sydney(`2026-11-${day}T08:00`),
      end: sydney(`2026-11-${day}T12:00`),
      breakMinutes: 0,
      urgent: false,
    });
    const estimate = pricer.estimate([shift("04"), shift("05")], 3);
    expect(estimate.ok && estimate.quotes).toHaveLength(2);
    expect(estimate.ok && estimate.totals.workedMinutes).toBe(240 * 2 * 3);
    expect(estimate.ok && estimate.totals.payCents).toBe(3313 * 4 * 2 * 3);
  });
});
