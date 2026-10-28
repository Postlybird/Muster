import { describe, expect, it } from "vitest";

import { summariseTicket, type TicketRecord } from "./tickets";

const today = "2026-10-28";

function record(overrides: Partial<TicketRecord>): TicketRecord {
  return {
    id: "t1",
    status: "verified",
    expiresOn: null,
    rejectionReason: null,
    archived: false,
    ...overrides,
  };
}

describe("ticket summary", () => {
  it("is missing with no copies, or only archived ones", () => {
    expect(summariseTicket([], today)).toEqual({ state: "missing" });
    expect(
      summariseTicket([record({ archived: true, status: "pending" })], today),
    ).toEqual({ state: "missing" });
  });

  it("shows a verified ticket and how long it lasts", () => {
    expect(
      summariseTicket([record({ expiresOn: "2027-06-30" })], today),
    ).toEqual({
      state: "verified",
      validUntil: "2027-06-30",
      expiringSoon: false,
    });
    expect(summariseTicket([record({})], today)).toEqual({
      state: "verified",
      validUntil: null,
      expiringSoon: false,
    });
  });

  it("warns when a verified ticket expires within 30 days", () => {
    expect(
      summariseTicket([record({ expiresOn: "2026-11-20" })], today),
    ).toMatchObject({ state: "verified", expiringSoon: true });
  });

  it("treats a verified ticket past its expiry date as expired", () => {
    expect(
      summariseTicket([record({ expiresOn: "2026-10-27" })], today),
    ).toEqual({ state: "expired", expiredOn: "2026-10-27" });
    expect(
      summariseTicket(
        [record({ status: "expired", expiresOn: "2026-10-01" })],
        today,
      ),
    ).toEqual({ state: "expired", expiredOn: "2026-10-01" });
  });

  it("uses a police check's accepted-until date", () => {
    expect(
      summariseTicket([record({ validUntil: "2026-10-01" })], today),
    ).toEqual({ state: "expired", expiredOn: "2026-10-01" });
    expect(
      summariseTicket([record({ validUntil: "2027-03-01" })], today),
    ).toMatchObject({ state: "verified", validUntil: "2027-03-01" });
  });

  it("shows a renewal being checked alongside the current ticket", () => {
    expect(
      summariseTicket(
        [
          record({ id: "old", expiresOn: "2026-11-05" }),
          record({ id: "new", status: "pending", expiresOn: "2029-11-05" }),
        ],
        today,
      ),
    ).toEqual({ state: "pending", openId: "new", verifiedUntil: "2026-11-05" });
  });

  it("shows why a ticket needs fixing", () => {
    expect(
      summariseTicket(
        [record({ status: "rejected", rejectionReason: "Blurry photo" })],
        today,
      ),
    ).toEqual({
      state: "rejected",
      openId: "t1",
      reason: "Blurry photo",
      verifiedUntil: null,
    });
  });
});
