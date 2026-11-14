import { describe, expect, it } from "vitest";

import { casualStatementDue } from "./casual-statement";

const from = new Date("2026-03-15T02:00:00Z");
const at = (iso: string) => new Date(iso);

describe("casualStatementDue", () => {
  it("is not due before 6 months", () => {
    expect(casualStatementDue(from, at("2026-09-14T23:00:00Z"))).toBeNull();
  });

  it("is due at 6 months, then 12, then every 12", () => {
    expect(casualStatementDue(from, at("2026-09-15T03:00:00Z"))).toBe(6);
    expect(casualStatementDue(from, at("2027-03-14T00:00:00Z"))).toBe(6);
    expect(casualStatementDue(from, at("2027-03-15T03:00:00Z"))).toBe(12);
    expect(casualStatementDue(from, at("2028-03-14T00:00:00Z"))).toBe(12);
    expect(casualStatementDue(from, at("2028-03-15T03:00:00Z"))).toBe(24);
    expect(casualStatementDue(from, at("2029-06-01T00:00:00Z"))).toBe(36);
  });

  it("gives only the latest date when several have passed", () => {
    expect(casualStatementDue(from, at("2030-01-01T00:00:00Z"))).toBe(36);
  });
});
