import { describe, expect, it } from "vitest";

import {
  bookingProblems,
  daysBetween,
  isExpired,
  validUntil,
  warningDue,
} from "./expiry";

describe("expiry warnings", () => {
  const days = [30, 14, 7];

  it("count whole days between dates", () => {
    expect(daysBetween("2026-10-28", "2026-11-04")).toBe(7);
    expect(daysBetween("2026-10-28", "2026-10-27")).toBe(-1);
    // Across the start of daylight saving.
    expect(daysBetween("2026-10-03", "2026-10-05")).toBe(2);
  });

  it("are the nearest one reached, so each goes once", () => {
    expect(warningDue("2026-10-28", "2026-12-28", days)).toBe(null);
    expect(warningDue("2026-10-28", "2026-11-20", days)).toBe(30);
    expect(warningDue("2026-10-28", "2026-11-08", days)).toBe(14);
    expect(warningDue("2026-10-28", "2026-11-01", days)).toBe(7);
    expect(warningDue("2026-10-28", "2026-10-28", days)).toBe(7);
  });

  it("stop once it's expired: the day after the last good day", () => {
    expect(warningDue("2026-10-28", "2026-10-27", days)).toBe(null);
    expect(isExpired("2026-10-28", "2026-10-28")).toBe(false);
    expect(isExpired("2026-10-28", "2026-10-27")).toBe(true);
  });

  it("count a police check from its issue date", () => {
    expect(
      validUntil(
        { kind: "police_check", issuedOn: "2026-01-15", expiresOn: null },
        12,
      ),
    ).toBe("2027-01-14");
    expect(
      validUntil(
        { kind: "ticket", issuedOn: "2020-01-15", expiresOn: "2031-01-15" },
        12,
      ),
    ).toBe("2031-01-15");
    expect(
      validUntil({ kind: "ticket", issuedOn: null, expiresOn: null }, 12),
    ).toBe(null);
  });
});

describe("booked shifts checked again", () => {
  it("are at risk for papers and status, not travel or other bookings", () => {
    expect(
      bookingProblems({
        eligible: false,
        reasons: ["ticket_expired", "too_far", "overlapping_shift", "blocked"],
        distanceKm: 40,
        flags: [],
      }),
    ).toEqual(["ticket_expired"]);
  });
});
