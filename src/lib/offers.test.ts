import { describe, expect, it } from "vitest";

import {
  distanceLabel,
  groupOffers,
  hazardsLabel,
  payLabel,
  type ShiftOffer,
} from "./offers";

function offer(overrides: Partial<ShiftOffer>): ShiftOffer {
  return {
    shift_id: "s1",
    job_id: "j1",
    starts_at: "2026-11-02T20:00:00Z",
    ends_at: "2026-11-03T04:30:00Z",
    break_minutes: 30,
    job_type: "multi_day",
    category_name: "Restoration labourer",
    business_name: "Harbour Restoration",
    business_rating: null,
    business_rating_count: 0,
    suburb: "Granville",
    state: "NSW",
    distance_km: 1.9,
    hourly_cents: 3313,
    estimate_cents: 26504,
    headcount: 3,
    police_check_required: false,
    no_known_hazards: false,
    hazards: ["Mould", "Category 3 water"],
    ppe: [],
    ppe_supplied_by: "business",
    tickets: ["White Card"],
    ...overrides,
  };
}

describe("offers", () => {
  it("groups a job's shifts into one offer, soonest first", () => {
    const grouped = groupOffers([
      offer({ shift_id: "s2", starts_at: "2026-11-03T20:00:00Z" }),
      offer({
        shift_id: "x1",
        job_id: "j2",
        starts_at: "2026-11-01T07:00:00Z",
      }),
      offer({ shift_id: "s1" }),
    ]);
    expect(grouped.map((g) => g.jobId)).toEqual(["j2", "j1"]);
    expect(grouped[1]?.shifts.map((s) => s.shift_id)).toEqual(["s1", "s2"]);
    expect(grouped[1]?.totalCents).toBe(53008);
  });

  it("describes the pay for one shift or several", () => {
    const [one] = groupOffers([offer({})]);
    expect(payLabel(one!)).toBe("$33.13 an hour · about $265.04 for the shift");
    const [two] = groupOffers([
      offer({}),
      offer({ shift_id: "s2", starts_at: "2026-11-03T20:00:00Z" }),
    ]);
    expect(payLabel(two!)).toBe(
      "$33.13 an hour · about $530.08 for all 2 shifts",
    );
  });

  it("leaves out a total it can't work out", () => {
    const [unpriced] = groupOffers([offer({ estimate_cents: null })]);
    expect(unpriced?.totalCents).toBeNull();
    expect(payLabel(unpriced!)).toBe("$33.13 an hour");
    const [noRate] = groupOffers([offer({ hourly_cents: null })]);
    expect(payLabel(noRate!)).toBe("Pay to be confirmed");
  });

  it("names hazards and distances in plain words", () => {
    expect(hazardsLabel(offer({}))).toBe("Hazards: Mould, Category 3 water");
    expect(hazardsLabel(offer({ no_known_hazards: true, hazards: [] }))).toBe(
      "No known hazards",
    );
    expect(distanceLabel(12.25)).toBe("12.3 km away");
    expect(distanceLabel(4, "from home")).toBe("4 km from home");
    expect(distanceLabel(null)).toBeNull();
  });
});
