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
import { ADMINS, BUSINESSES, WORKERS } from "./people";
import { DEFAULT_BASE_RATES_CENTS } from "./rates";

const credentialCodes = new Set(CREDENTIAL_TYPES.map((c) => c.code));
const categoryCodes = new Set(CATEGORIES.map((c) => c.code));
const ppeCodes = new Set(PPE_ITEMS.map((p) => p.code));

describe("seed catalogues", () => {
  it("keep the brief's appendix, and add the other industries", () => {
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
  });

  it("put every work type in a known industry, with a starting pay rate", () => {
    const industryCodes = new Set(INDUSTRIES.map((i) => i.code));
    for (const category of CATEGORIES) {
      expect(industryCodes).toContain(category.industry);
      expect(DEFAULT_BASE_RATES_CENTS[category.code]).toBeGreaterThan(0);
    }
    for (const industry of INDUSTRIES) {
      expect(Object.keys(INDUSTRY_ICONS)).toContain(industry.icon);
      expect(CATEGORIES.some((c) => c.industry === industry.code)).toBe(true);
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

  it("puts everyone in known Sydney suburbs and work types", () => {
    for (const worker of WORKERS) {
      expect(findSuburb(worker.suburb), worker.suburb).toBeDefined();
      for (const c of worker.categories)
        expect(categoryCodes).toContain(c.code);
      for (const t of worker.tickets) expect(credentialCodes).toContain(t.code);
    }
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
