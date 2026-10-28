import { describe, expect, it } from "vitest";

import {
  formatCents,
  formatDate,
  formatDateTime,
  formatDayShort,
  formatTime,
  fromSydneyTime,
  sydneyDateKey,
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

describe("formatCalendarDate", () => {
  it("formats a date-only value without shifting the day", async () => {
    const { formatCalendarDate } = await import("./format");
    expect(formatCalendarDate("2026-07-01")).toBe("01/07/2026");
  });
});
