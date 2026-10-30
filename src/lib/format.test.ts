import { describe, expect, it } from "vitest";

import {
  formatCents,
  formatDate,
  formatDateTime,
  formatDayShort,
  dateKeyIn,
  formatTime,
  fromLocalTime,
  fromSydneyTime,
  sydneyDateKey,
  zoneNote,
  zoneOf,
} from "./format";

describe("Australian formats", () => {
  // 28/10/2026 is during daylight saving (AEDT, UTC+11).
  const morning = new Date("2026-10-27T20:30:00Z");

  it("shows dates as dd/mm/yyyy in Sydney time", () => {
    expect(formatDate(morning)).toBe("28/10/2026");
    expect(formatDayShort(morning)).toBe("Wed 28 Oct");
  });

  it("shows times in Sydney time", () => {
    expect(formatTime(morning)).toBe("7:30 am");
    expect(formatDateTime(morning)).toBe("28/10/2026, 7:30 am");
  });

  it("uses standard time (AEST, UTC+10) in winter", () => {
    expect(formatDateTime("2026-06-30T23:00:00Z")).toBe("01/07/2026, 9:00 am");
  });

  it("keys dates by the Sydney calendar day, not UTC", () => {
    expect(sydneyDateKey("2026-10-27T14:00:00Z")).toBe("2026-10-28");
  });

  it("converts Sydney wall-clock time to UTC across daylight saving", () => {
    expect(fromSydneyTime("2026-10-28", "07:30").toISOString()).toBe(
      "2026-10-27T20:30:00.000Z",
    );
    expect(fromSydneyTime("2026-07-01", "07:30").toISOString()).toBe(
      "2026-06-30T21:30:00.000Z",
    );
  });

  it("formats money held in cents as AUD", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-550)).toBe("-$5.50");
  });
});

describe("times at the site", () => {
  // 7:30 am on 28/10/2026 in Sydney (AEDT, UTC+11).
  const morning = new Date("2026-10-27T20:30:00Z");

  it("finds each state's time zone, and Sydney's for anything else", () => {
    expect(zoneOf("WA")).toBe("Australia/Perth");
    expect(zoneOf("QLD")).toBe("Australia/Brisbane");
    expect(zoneOf("NSW")).toBe("Australia/Sydney");
    expect(zoneOf(null)).toBe("Australia/Sydney");
    expect(zoneOf("toString")).toBe("Australia/Sydney");
  });

  it("shows a shift in its own state's time", () => {
    expect(formatTime(morning, zoneOf("WA"))).toBe("4:30 am");
    // Queensland has no daylight saving; South Australia is half an hour behind.
    expect(formatTime(morning, zoneOf("QLD"))).toBe("6:30 am");
    expect(formatTime(morning, zoneOf("SA"))).toBe("7:00 am");
    expect(formatTime(morning, zoneOf("NT"))).toBe("6:00 am");
    expect(formatDateTime(morning, zoneOf("WA"))).toBe("28/10/2026, 4:30 am");
  });

  it("names the zone when it isn't Sydney's", () => {
    expect(zoneNote(zoneOf("WA"))).toBe(" (Perth time)");
    expect(zoneNote(zoneOf("NSW"))).toBe("");
  });

  it("keys dates by the site's calendar day", () => {
    // 10 pm in Perth is already the next day in Sydney.
    expect(dateKeyIn("2026-10-27T14:00:00Z", zoneOf("WA"))).toBe("2026-10-27");
    expect(sydneyDateKey("2026-10-27T14:00:00Z")).toBe("2026-10-28");
  });

  it("converts the site's wall-clock time to UTC", () => {
    expect(
      fromLocalTime("2026-10-28", "07:30", zoneOf("WA")).toISOString(),
    ).toBe("2026-10-27T23:30:00.000Z");
  });
});

describe("formatHours", () => {
  it("shows minutes as hours, without trailing zeros", async () => {
    const { formatHours } = await import("./format");
    expect(formatHours(456)).toBe("7.6 h");
    expect(formatHours(480)).toBe("8 h");
    expect(formatHours(225)).toBe("3.75 h");
    expect(formatHours(20)).toBe("0.33 h");
  });
});

describe("formatCalendarDate", () => {
  it("formats a date-only value without shifting the day", async () => {
    const { formatCalendarDate } = await import("./format");
    expect(formatCalendarDate("2026-07-01")).toBe("01/07/2026");
  });
});
