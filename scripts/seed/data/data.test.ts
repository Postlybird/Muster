import { describe, expect, it } from "vitest";

import { DEMO_ABNS } from "@/adapters/abn/mock";
import { isValidAbn } from "@/adapters/abn/validate";
import { isDemoEmail } from "@/config/demo";
import { findSuburb } from "@/data/sydney-suburbs";
import { normaliseAuMobile, normaliseAuPhone } from "@/lib/phone";

import { CATEGORIES, CREDENTIAL_TYPES, HAZARDS, PPE_ITEMS } from "./catalogues";
import { ADMINS, BUSINESSES, WORKERS } from "./people";
import { SETTINGS } from "./settings";

const credentialCodes = new Set(CREDENTIAL_TYPES.map((c) => c.code));
const categoryCodes = new Set(CATEGORIES.map((c) => c.code));
const ppeCodes = new Set(PPE_ITEMS.map((p) => p.code));

describe("seed catalogues", () => {
  it("match the brief's appendix", () => {
    expect(CATEGORIES).toHaveLength(8);
    expect(HAZARDS).toHaveLength(10);
    expect(PPE_ITEMS).toHaveLength(12);
  });

  it("only reference tickets and PPE that exist", () => {
    for (const category of CATEGORIES) {
      for (const code of category.requiredCredentials)
        expect(credentialCodes).toContain(code);
      for (const code of category.defaultPpe) expect(ppeCodes).toContain(code);
    }
  });

  it("have unique codes and setting keys", () => {
    for (const list of [CREDENTIAL_TYPES, CATEGORIES, HAZARDS, PPE_ITEMS]) {
      const codes = list.map((x) => x.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
    const keys = SETTINGS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
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
