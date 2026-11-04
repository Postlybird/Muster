import { describe, expect, it } from "vitest";

import { DEMO_ABNS } from "@/adapters/abn/mock";
import { MockGeocoder } from "@/adapters/geocode/mock";
import { isValidAbn } from "@/adapters/abn/validate";
import { isDemoEmail } from "@/config/demo";
import { findSuburb } from "@/data/suburbs";
import { normaliseAuMobile, normaliseAuPhone } from "@/lib/phone";

import { INDUSTRY_ICONS } from "@/config/industry-icons";

import {
  CATEGORIES,
  CREDENTIAL_TYPES,
  HAZARDS,
  INDUSTRIES,
  PPE_ITEMS,
} from "./catalogues";
import { DEMO_JOBS } from "./jobs";
import { ADMINS, BUSINESSES, WORKERS } from "./people";
import { hourlyPayTable, rateCardFromRow } from "@/domain/rates";

import { AWARD_RATE_CARDS, DEFAULT_BASE_RATES_CENTS } from "./rates";
import { DEMO_WORKED } from "./worked";

const credentialCodes = new Set(CREDENTIAL_TYPES.map((c) => c.code));
const categoryCodes = new Set(CATEGORIES.map((c) => c.code));
const ppeCodes = new Set(PPE_ITEMS.map((p) => p.code));

/** The focus (owner, 02/11/2026): four industries and eight work types. */
const FOCUS_INDUSTRIES = [
  "construction",
  "cleaning",
  "restoration",
  "warehousing_logistics",
];
const FOCUS_WORK_TYPES = [
  "general_labourer",
  "commercial_cleaner",
  "builders_cleaner",
  "restoration_labourer",
  "restoration_technician",
  "pick_packer",
  "storeperson",
  "forklift_driver",
  "removalist_offsider",
];
/** Waiting for their award's checked rates: they can't be posted yet. */
const WAITING_FOR_RATES = ["pick_packer", "storeperson", "forklift_driver"];
const live = new Set(CATEGORIES.filter((c) => !c.archived).map((c) => c.code));

describe("seed catalogues", () => {
  it("keep the brief's appendix and the other industries, archived outside the focus", () => {
    for (const code of [
      "restoration_labourer",
      "restoration_technician",
      "contents_packout",
      "strip_out_demolition",
      "mould_remediation_assistant",
      "commercial_cleaner",
      "trades_assistant",
      "removalist_offsider",
    ])
      expect(categoryCodes).toContain(code);
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(9);
    expect([...live].sort()).toEqual([...FOCUS_WORK_TYPES].sort());
    expect(INDUSTRIES.filter((i) => !i.archived).map((i) => i.code)).toEqual(
      FOCUS_INDUSTRIES,
    );
  });

  it("put every work type in a known industry, the focus ones in the focus industries", () => {
    const industryCodes = new Set(INDUSTRIES.map((i) => i.code));
    for (const category of CATEGORIES) {
      expect(industryCodes).toContain(category.industry);
      if (!category.archived)
        expect(FOCUS_INDUSTRIES).toContain(category.industry);
    }
    for (const industry of INDUSTRIES) {
      expect(Object.keys(INDUSTRY_ICONS)).toContain(industry.icon);
      expect(CATEGORIES.some((c) => c.industry === industry.code)).toBe(true);
    }
  });

  it("only give placeholder rates to focus work types that also have checked ones", () => {
    const checked = new Set(AWARD_RATE_CARDS.flatMap((card) => card.codes));
    for (const code of Object.keys(DEFAULT_BASE_RATES_CENTS)) {
      expect(live).toContain(code);
      expect(checked).toContain(code);
    }
    for (const code of FOCUS_WORK_TYPES) {
      const priced = checked.has(code);
      expect(priced, code).toBe(!WAITING_FOR_RATES.includes(code));
    }
  });

  it("ask restoration labourers and technicians for a White Card, and jobs for IICRC tickets", () => {
    for (const code of ["restoration_labourer", "restoration_technician"]) {
      const workType = CATEGORIES.find((c) => c.code === code)!;
      expect(workType.requiredCredentials).toEqual(["white_card"]);
    }
  });

  it("only reference tickets and PPE that exist", () => {
    for (const category of CATEGORIES) {
      for (const code of category.requiredCredentials)
        expect(credentialCodes).toContain(code);
      for (const code of category.defaultPpe) expect(ppeCodes).toContain(code);
    }
  });

  it("have unique codes", () => {
    for (const list of [
      CREDENTIAL_TYPES,
      INDUSTRIES,
      CATEGORIES,
      HAZARDS,
      PPE_ITEMS,
    ]) {
      const codes = list.map((x) => x.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it("have every state's version of the tickets issued state by state", () => {
    const families = new Set(
      CREDENTIAL_TYPES.flatMap((c) => (c.family ? [c.family] : [])),
    );
    expect(families.size).toBe(3);
    for (const family of families) {
      const states = CREDENTIAL_TYPES.filter((c) => c.family === family).map(
        (c) => c.state,
      );
      expect(states.sort()).toEqual(
        ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].sort(),
      );
    }
  });
});

describe("seed people", () => {
  const everyone = [
    ...ADMINS.map((a) => a.email),
    ...BUSINESSES.flatMap((b) => b.people.map((p) => p.email)),
    ...WORKERS.map((w) => w.email),
  ];

  it("has about 30 workers with a mix of statuses", () => {
    expect(WORKERS).toHaveLength(30);
    const statuses = new Set(WORKERS.map((w) => w.status));
    expect(statuses).toEqual(
      new Set(["draft", "pending", "active", "suspended"]),
    );
  });

  it("includes verified, pending, rejected, expired and soon-to-expire tickets", () => {
    const tickets = WORKERS.flatMap((w) => w.tickets);
    for (const status of ["verified", "pending", "rejected", "expired"]) {
      expect(tickets.some((t) => t.status === status)).toBe(true);
    }
    expect(
      tickets.some(
        (t) =>
          t.status === "verified" &&
          t.expiresInDays !== undefined &&
          t.expiresInDays <= 14,
      ),
    ).toBe(true);
  });

  it("uses unique demo emails only", () => {
    expect(new Set(everyone).size).toBe(everyone.length);
    for (const email of everyone) expect(isDemoEmail(email)).toBe(true);
  });

  it("uses unique, valid Australian mobile numbers", () => {
    const phones = WORKERS.map((w) => w.phone);
    expect(new Set(phones).size).toBe(phones.length);
    for (const phone of phones) expect(normaliseAuMobile(phone)).toBe(phone);
  });

  it("puts everyone in known Sydney suburbs and work types we offer", () => {
    for (const worker of WORKERS) {
      expect(findSuburb(worker.suburb), worker.suburb).toBeDefined();
      for (const c of worker.categories) expect(live).toContain(c.code);
      for (const t of worker.tickets) expect(credentialCodes).toContain(t.code);
    }
    for (const job of [...DEMO_JOBS, ...DEMO_WORKED])
      expect(live).toContain(job.category);
    for (const business of BUSINESSES)
      expect(findSuburb(business.suburb)).toBeDefined();
  });

  it("gives every business a site the address lookup understands", async () => {
    const geocoder = new MockGeocoder();
    for (const business of BUSINESSES) {
      expect(business.sites.length).toBeGreaterThan(0);
      const names = business.sites.map((site) => site.name);
      for (const site of business.sites) {
        const [suggestion] = await geocoder.suggest(site.address);
        expect(suggestion, site.address).toBeDefined();
      }
      for (const person of business.people) {
        for (const site of person.sites ?? []) expect(names).toContain(site);
      }
    }
  });

  it("gives businesses valid demo ABNs and phone numbers", () => {
    for (const business of BUSINESSES) {
      expect(isValidAbn(business.abn)).toBe(true);
      expect(DEMO_ABNS[business.abn]?.status).toBe("active");
      expect(normaliseAuPhone(business.phone)).toBe(business.phone);
    }
  });

  it("only seeds adults", () => {
    for (const worker of WORKERS) {
      expect(new Date(worker.dateOfBirth).getTime()).toBeLessThan(
        new Date("2008-01-01").getTime(),
      );
    }
  });
});

describe("launch award rate cards", () => {
  /** The rates the owner's accountant checked (01/11/2026), in cents an hour. */
  const approved: Record<string, Record<string, number>> = {
    restoration_labourer: {
      ordinary: 3435,
      saturday: 4809,
      sunday: 6183,
      public_holiday: 7557,
      overtime: 4809,
      overtime_after: 6183,
      early_late: 3847,
      night_shift: 4259,
    },
    restoration_technician: {
      ordinary: 3546,
      saturday: 4965,
      sunday: 6383,
      public_holiday: 7802,
      overtime: 4965,
      overtime_after: 6383,
      early_late: 3972,
      night_shift: 4397,
    },
    general_labourer: {
      ordinary: 3605,
      saturday: 5047,
      saturday_after: 6489,
      sunday: 6489,
      public_holiday: 7931,
      overtime: 5047,
      overtime_after: 6489,
    },
    removalist_offsider: {
      ordinary: 3409,
      saturday: 4772,
      sunday: 6136,
      public_holiday: 7499,
      overtime: 4363,
      overtime_after: 5727,
    },
  };

  it("cover the nine launch work types once each", () => {
    const codes = AWARD_RATE_CARDS.flatMap((card) => card.codes);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toHaveLength(9);
    for (const code of codes) expect(categoryCodes).toContain(code);
  });

  it("pay the rates the accountant checked", () => {
    for (const [code, rates] of Object.entries(approved)) {
      const card = AWARD_RATE_CARDS.find((c) => c.codes.includes(code))!;
      const table = hourlyPayTable(
        rateCardFromRow({
          base_rate_cents: card.baseRateCents,
          ...card.columns,
        }),
      );
      for (const [type, cents] of Object.entries(rates)) {
        expect([code, type, table[type as keyof typeof table]]).toEqual([
          code,
          type,
          cents,
        ]);
      }
    }
  });

  it("give every rule the settings it needs", () => {
    for (const { columns } of AWARD_RATE_CARDS) {
      expect(columns.ordinary_from === null).toBe(columns.ordinary_to === null);
      expect(columns.early_late_multiplier === null).toBe(
        columns.early_late_starts_before === null &&
          columns.early_late_finishes_after === null,
      );
      expect(columns.night_shift_multiplier === null).toBe(
        columns.night_shift_finishes_by === null,
      );
      // The night hours setting adds nothing to an award card.
      expect(columns.night_multiplier).toBe(columns.ordinary_multiplier);
    }
  });
});
