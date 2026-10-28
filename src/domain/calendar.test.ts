import { describe, expect, it } from "vitest";

import { toIcs } from "./calendar";

const event = {
  uid: "a1@shifts",
  start: new Date("2026-11-02T20:00:00Z"),
  end: new Date("2026-11-03T04:30:00Z"),
  summary: "Restoration labourer for Harbour Restoration",
  location: "42 Parramatta Rd, Granville NSW 2142",
  description: "Report to Tom; bring boots.\nSix units.",
};

describe("calendar files", () => {
  const ics = toIcs([event], {
    productName: "Muster",
    now: new Date("2026-10-28T00:00:00Z"),
  });
  const lines = ics.split("\r\n");

  it("writes each shift in UTC", () => {
    expect(lines).toContain("DTSTART:20261102T200000Z");
    expect(lines).toContain("DTEND:20261103T043000Z");
    expect(lines).toContain("DTSTAMP:20261028T000000Z");
    expect(lines).toContain("UID:a1@shifts");
  });

  it("escapes commas, semicolons and new lines", () => {
    expect(lines).toContain("LOCATION:42 Parramatta Rd\\, Granville NSW 2142");
    expect(lines).toContain(
      "DESCRIPTION:Report to Tom\; bring boots.\\nSix units.",
    );
  });

  it("reminds two hours before", () => {
    expect(lines).toContain("TRIGGER:-PT2H");
  });

  it("folds long lines and ends every line properly", () => {
    const long = toIcs([{ ...event, description: "é".repeat(100) }], {
      productName: "Muster",
    });
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(long.endsWith("END:VCALENDAR\r\n")).toBe(true);
    // Unfolded, nothing is lost.
    expect(long.replace(/\r\n /g, "")).toContain(
      `DESCRIPTION:${"é".repeat(100)}`,
    );
  });
});
