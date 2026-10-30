import { describe, expect, it } from "vitest";

import { fromLocalTime, fromSydneyTime, TIME_ZONE } from "./format";
import {
  groupBusinessHours,
  hoursFromForm,
  shiftDay,
  timeInputValue,
  type BusinessHours,
} from "./timesheets";

const now = new Date("2026-11-04T08:00:00Z");

function booking(overrides: Partial<BusinessHours>): BusinessHours {
  return {
    assignment_id: "a",
    timesheet_id: null,
    job_id: "j",
    worker_id: "w",
    worker_name: "Hannah Schmidt",
    category_name: "Commercial cleaner",
    site_name: "Blacktown office tower",
    state: "NSW",
    shift_starts_at: "2026-11-03T20:00:00Z",
    shift_ends_at: "2026-11-04T04:00:00Z",
    shift_break_minutes: 30,
    started_at: null,
    arrival_confirmed: false,
    clocked_out_at: null,
    away_reasons: [],
    offline: false,
    recorded_start: null,
    recorded_finish: null,
    start_at: null,
    finish_at: null,
    break_minutes: null,
    status: null,
    approve_by: null,
    adjusted_at: null,
    business_note: null,
    worker_note: null,
    resolution: null,
    bill_cents: null,
    ...overrides,
  };
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("the business's hours", () => {
  it("sorts bookings into what needs doing", () => {
    const groups = groupBusinessHours(
      [
        booking({
          assignment_id: "waiting",
          timesheet_id: "t1",
          status: "submitted",
        }),
        booking({ assignment_id: "no clock-in" }),
        booking({
          assignment_id: "still on",
          shift_ends_at: "2026-11-04T09:00:00Z",
        }),
        booking({
          assignment_id: "queried",
          timesheet_id: "t2",
          status: "disputed",
        }),
        booking({
          assignment_id: "approved",
          timesheet_id: "t3",
          status: "auto_approved",
        }),
        booking({
          assignment_id: "rejected",
          timesheet_id: "t4",
          status: "rejected",
        }),
      ],
      now,
    );
    const ids = (rows: BusinessHours[]) => rows.map((row) => row.assignment_id);
    expect(ids(groups.toApprove)).toEqual(["waiting"]);
    expect(ids(groups.missing)).toEqual(["no clock-in"]);
    expect(ids(groups.queried)).toEqual(["queried"]);
    expect(ids(groups.done)).toEqual(["approved", "rejected"]);
  });
});

describe("the hours form", () => {
  it("reads times on the shift's day, with the break and note", () => {
    const result = hoursFromForm(
      form({
        start: "07:00",
        finish: "15:30",
        break: "30",
        note: " Left early ",
      }),
      { date: "2026-11-04", timeZone: TIME_ZONE },
      { noteRequired: true },
    );
    expect(result).toEqual({
      ok: true,
      hours: {
        start: fromSydneyTime("2026-11-04", "07:00"),
        finish: fromSydneyTime("2026-11-04", "15:30"),
        breakMinutes: 30,
      },
      note: "Left early",
    });
  });

  it("asks for a note when changing hours", () => {
    const result = hoursFromForm(
      form({ start: "07:00", finish: "15:30", break: "0", note: "" }),
      { date: "2026-11-04", timeZone: TIME_ZONE },
      { noteRequired: true },
    );
    expect(!result.ok && result.state).toMatchObject({
      status: "error",
      fieldErrors: { note: ["Say what changed, for the worker"] },
    });
  });

  it("treats an empty break as none", () => {
    const result = hoursFromForm(
      form({ start: "22:00", finish: "06:00", break: "" }),
      { date: "2026-11-06", timeZone: TIME_ZONE },
      { noteRequired: false },
    );
    expect(result.ok && result.hours.breakMinutes).toBe(0);
    expect(result.ok && result.hours.finish).toEqual(
      fromSydneyTime("2026-11-07", "06:00"),
    );
  });

  it("points at the break when it's too long", () => {
    const result = hoursFromForm(
      form({ start: "07:00", finish: "07:30", break: "30" }),
      { date: "2026-11-04", timeZone: TIME_ZONE },
      { noteRequired: false },
    );
    expect(!result.ok && result.state).toMatchObject({
      fieldErrors: {
        break: ["The break must be shorter than the time worked."],
      },
    });
  });
});

describe("hours at sites outside Sydney", () => {
  const perth = "Australia/Perth";

  it("reads times in the site's time zone", () => {
    const result = hoursFromForm(
      form({ start: "07:00", finish: "15:30", break: "30" }),
      { date: "2026-11-04", timeZone: perth },
      { noteRequired: false },
    );
    expect(result.ok && result.hours.start).toEqual(
      fromLocalTime("2026-11-04", "07:00", perth),
    );
    expect(result.ok && result.hours.start.toISOString()).toBe(
      "2026-11-03T23:00:00.000Z",
    );
  });

  it("refuses a time zone that isn't a state's", () => {
    const result = hoursFromForm(
      form({ start: "07:00", finish: "15:30", break: "30" }),
      { date: "2026-11-04", timeZone: "Europe/London" },
      { noteRequired: false },
    );
    expect(result.ok).toBe(false);
  });

  it("finds the shift's day at the site", () => {
    // 10 pm in Perth is already the next day in Sydney.
    expect(shiftDay("2026-11-04T14:00:00Z", perth)).toEqual({
      date: "2026-11-04",
      timeZone: perth,
    });
  });
});

describe("time inputs", () => {
  it("shows the site's time on a 24-hour clock", () => {
    expect(timeInputValue("2026-11-03T20:05:00Z", TIME_ZONE)).toBe("07:05");
    expect(timeInputValue("2026-11-04T04:30:00Z", TIME_ZONE)).toBe("15:30");
    expect(timeInputValue("2026-11-04T04:30:00Z", "Australia/Perth")).toBe(
      "12:30",
    );
  });
});
