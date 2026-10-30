import { describe, expect, it } from "vitest";

import {
  heldInState,
  ticketForState,
  ticketsForState,
  type StateTicket,
} from "./state-tickets";

const RSA = "Responsible Service of Alcohol (RSA)";
const catalogue: StateTicket[] = [
  { id: "rsa-nsw", state: "NSW", family: RSA },
  { id: "rsa-vic", state: "VIC", family: RSA },
  { id: "white-card", state: null, family: null },
  { id: "nsw-only", state: "NSW", family: null },
];

describe("tickets issued by each state", () => {
  it("swaps a ticket for the state's own version", () => {
    expect(ticketForState("rsa-nsw", "VIC", catalogue)).toBe("rsa-vic");
    expect(ticketForState("rsa-vic", "NSW", catalogue)).toBe("rsa-nsw");
    expect(ticketForState("rsa-nsw", "NSW", catalogue)).toBe("rsa-nsw");
  });

  it("keeps tickets accepted Australia-wide", () => {
    expect(ticketForState("white-card", "VIC", catalogue)).toBe("white-card");
  });

  it("keeps the ticket when the state has no version of it yet", () => {
    expect(ticketForState("rsa-nsw", "WA", catalogue)).toBe("rsa-nsw");
    expect(ticketForState("rsa-nsw", null, catalogue)).toBe("rsa-nsw");
    expect(ticketForState("unknown", "VIC", catalogue)).toBe("unknown");
  });

  it("lists each ticket once", () => {
    expect(
      ticketsForState(["rsa-nsw", "rsa-vic", "white-card"], "VIC", catalogue),
    ).toEqual(["rsa-vic", "white-card"]);
  });

  it("says which tickets people in a state hold", () => {
    const byId = (id: string) => catalogue.find((t) => t.id === id)!;
    expect(heldInState(byId("white-card"), "VIC")).toBe(true);
    expect(heldInState(byId("rsa-vic"), "VIC")).toBe(true);
    expect(heldInState(byId("rsa-nsw"), "VIC")).toBe(false);
    expect(heldInState(byId("nsw-only"), "VIC")).toBe(false);
  });
});
