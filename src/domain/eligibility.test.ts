import { describe, expect, it } from "vitest";

import {
  checkEligibility,
  distanceKm,
  rankScore,
  type MatchRules,
  type ShiftFacts,
  type WorkerFacts,
} from "./eligibility";

// Parramatta (site) and Westmead (home), about 3 km apart.
const SITE = { lat: -33.815, lng: 151.003 };
const HOME = { lat: -33.807, lng: 150.987 };

const shift: ShiftFacts = {
  businessId: "harbour",
  categoryId: "labourer",
  level: 1,
  start: new Date("2026-11-04T20:00:00Z"),
  end: new Date("2026-11-05T04:30:00Z"),
  date: "2026-11-05",
  siteLat: SITE.lat,
  siteLng: SITE.lng,
  requiredTicketTypeIds: ["white_card"],
  policeCheckRequired: false,
};

const worker: WorkerFacts = {
  id: "w1",
  status: "active",
  lat: HOME.lat,
  lng: HOME.lng,
  travelRadiusKm: 20,
  categories: [{ categoryId: "labourer", level: 1, yearsExperience: 3 }],
  credentials: [
    {
      typeId: "white_card",
      kind: "ticket",
      issuedOn: "2020-01-01",
      expiresOn: null,
    },
  ],
  rightToWork: {
    status: "verified",
    basis: "citizen",
    visaExpiry: null,
    nextCheckDue: null,
    workLimitFlag: false,
  },
  blockedDates: [],
  bookings: [],
};

const rules: MatchRules = {
  blockedWorkerIds: new Set(),
  policeCheckMaxAgeMonths: 12,
};

function reasons(
  w: Partial<WorkerFacts>,
  s: Partial<ShiftFacts> = {},
  r = rules,
) {
  return checkEligibility({ ...worker, ...w }, { ...shift, ...s }, r).reasons;
}

describe("distance", () => {
  it("is the straight-line distance in kilometres", () => {
    const d = distanceKm(HOME.lat, HOME.lng, SITE.lat, SITE.lng);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(2);
    // Sydney CBD to Parramatta is about 19 km.
    expect(distanceKm(-33.8688, 151.2093, -33.815, 151.003)).toBeCloseTo(
      19.9,
      0,
    );
  });
});

describe("who can work a shift", () => {
  it("accepts an active worker who meets every rule", () => {
    const result = checkEligibility(worker, shift, rules);
    expect(result).toMatchObject({ eligible: true, reasons: [], flags: [] });
    expect(result.distanceKm).toBeGreaterThan(1);
  });

  it("needs the worker active and not blocked by the business", () => {
    expect(reasons({ status: "suspended" })).toEqual(["not_active"]);
    expect(
      reasons({}, {}, { ...rules, blockedWorkerIds: new Set(["w1"]) }),
    ).toEqual(["blocked"]);
  });

  it("needs the type of work at a high enough level", () => {
    expect(reasons({ categories: [] })).toEqual(["no_work_type"]);
    expect(reasons({}, { level: 2 })).toEqual(["level"]);
  });

  it("needs every ticket verified and valid on the shift date", () => {
    expect(reasons({ credentials: [] })).toEqual(["ticket_missing"]);
    expect(
      reasons({
        credentials: [
          {
            typeId: "white_card",
            kind: "ticket",
            issuedOn: null,
            expiresOn: "2026-11-04",
          },
        ],
      }),
    ).toEqual(["ticket_expired"]);
    expect(
      reasons({
        credentials: [
          {
            typeId: "white_card",
            kind: "ticket",
            issuedOn: null,
            expiresOn: "2026-11-05",
          },
        ],
      }),
    ).toEqual([]);
  });

  it("needs right to work confirmed for the shift date", () => {
    const visa = {
      status: "verified",
      basis: "visa",
      visaExpiry: "2026-11-04",
      nextCheckDue: "2026-11-04",
      workLimitFlag: true,
    };
    expect(reasons({ rightToWork: null })).toEqual(["right_to_work"]);
    expect(reasons({ rightToWork: { ...visa, status: "pending" } })).toEqual([
      "right_to_work",
    ]);
    expect(reasons({ rightToWork: visa })).toEqual(["right_to_work"]);
    // A bridging visa with no end date holds until its next VEVO check.
    expect(
      reasons({
        rightToWork: { ...visa, visaExpiry: null, nextCheckDue: "2027-01-31" },
      }),
    ).toEqual([]);
    // Work-hour limits are flagged for admin, not blocked.
    const flagged = checkEligibility(
      { ...worker, rightToWork: { ...visa, visaExpiry: "2027-06-30" } },
      shift,
      rules,
    );
    expect(flagged).toMatchObject({ eligible: true, flags: ["work_limit"] });
  });

  it("needs a current police check when the job asks for one", () => {
    const check = (issuedOn: string) => ({
      typeId: "police",
      kind: "police_check",
      issuedOn,
      expiresOn: null,
    });
    expect(reasons({}, { policeCheckRequired: true })).toEqual([
      "police_check",
    ]);
    expect(
      reasons(
        { credentials: [...worker.credentials, check("2025-11-06")] },
        { policeCheckRequired: true },
      ),
    ).toEqual([]);
    expect(
      reasons(
        { credentials: [...worker.credentials, check("2025-11-05")] },
        { policeCheckRequired: true },
      ),
    ).toEqual(["police_check"]);
  });

  it("needs the site within the worker's travel distance", () => {
    expect(reasons({ travelRadiusKm: 1 })).toEqual(["too_far"]);
    expect(reasons({ lat: null, lng: null })).toEqual(["too_far"]);
  });

  it("respects blocked-out days and existing bookings", () => {
    expect(reasons({ blockedDates: ["2026-11-05"] })).toEqual(["date_blocked"]);
    expect(
      reasons({
        bookings: [
          {
            start: new Date("2026-11-05T03:00:00Z"),
            end: new Date("2026-11-05T07:00:00Z"),
          },
        ],
      }),
    ).toEqual(["overlapping_shift"]);
    // Back-to-back is fine.
    expect(
      reasons({
        bookings: [
          {
            start: new Date("2026-11-05T04:30:00Z"),
            end: new Date("2026-11-05T08:00:00Z"),
          },
        ],
      }),
    ).toEqual([]);
  });

  it("lists every rule that fails", () => {
    expect(
      reasons({ status: "pending", credentials: [], travelRadiusKm: 1 }),
    ).toEqual(["not_active", "ticket_missing", "too_far"]);
  });
});

describe("ranking", () => {
  const base = {
    favourite: false,
    shiftsWithBusiness: 0,
    rating: 4.5,
    reliability: 95,
    distanceKm: 10,
    yearsExperience: 2,
  };

  it("puts the business's favourites first", () => {
    expect(rankScore({ ...base, favourite: true, rating: 3 })).toBeGreaterThan(
      rankScore({
        ...base,
        shiftsWithBusiness: 10,
        rating: 5,
        reliability: 100,
      }),
    );
  });

  it("then past shifts with the business, rating and reliability", () => {
    expect(rankScore({ ...base, shiftsWithBusiness: 3 })).toBeGreaterThan(
      rankScore(base),
    );
    expect(rankScore({ ...base, rating: 4.9 })).toBeGreaterThan(
      rankScore(base),
    );
    expect(rankScore({ ...base, reliability: 99 })).toBeGreaterThan(
      rankScore(base),
    );
  });

  it("prefers closer and more experienced workers", () => {
    expect(rankScore({ ...base, distanceKm: 3 })).toBeGreaterThan(
      rankScore(base),
    );
    expect(rankScore({ ...base, yearsExperience: 8 })).toBeGreaterThan(
      rankScore(base),
    );
  });

  it("gives new workers a fair middle score", () => {
    const newcomer = rankScore({ ...base, rating: null, reliability: null });
    expect(newcomer).toBeLessThan(rankScore(base));
    expect(newcomer).toBeGreaterThan(
      rankScore({ ...base, rating: 3, reliability: 60 }),
    );
  });
});
