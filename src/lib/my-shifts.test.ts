import { describe, expect, it } from "vitest";

import { groupMyShifts, type MyShift } from "./my-shifts";

function shift(overrides: Partial<MyShift>): MyShift {
  return {
    shift_id: "s1",
    job_id: "j1",
    starts_at: "2026-11-02T20:00:00Z",
    ends_at: "2026-11-03T04:30:00Z",
    break_minutes: 30,
    job_type: "multi_day",
    category_name: "Restoration labourer",
    business_name: "Harbour Restoration",
    suburb: "Granville",
    application_status: "applied",
    assignment_id: null,
    assignment_status: null,
    hourly_cents: 3313,
    estimate_cents: 26504,
    ...overrides,
  };
}

describe("my shifts", () => {
  const now = new Date("2026-10-30T00:00:00Z");

  it("sorts shifts still to come into booked, applied and filled", () => {
    const groups = groupMyShifts(
      [
        shift({
          shift_id: "b2",
          starts_at: "2026-11-03T20:00:00Z",
          ends_at: "2026-11-04T04:30:00Z",
          application_status: "booked",
          assignment_id: "x2",
          assignment_status: "confirmed",
        }),
        shift({
          shift_id: "b1",
          application_status: "booked",
          assignment_id: "x1",
          assignment_status: "confirmed",
        }),
        shift({ shift_id: "a1", job_id: "j2" }),
        shift({ shift_id: "d1", job_id: "j3", application_status: "declined" }),
        // Already over.
        shift({
          shift_id: "old",
          job_id: "j4",
          starts_at: "2026-10-01T20:00:00Z",
          ends_at: "2026-10-02T04:30:00Z",
          application_status: "booked",
          assignment_status: "confirmed",
        }),
      ],
      now,
    );
    expect(groups.booked).toHaveLength(1);
    expect(groups.booked[0]?.shifts.map((s) => s.shift_id)).toEqual([
      "b1",
      "b2",
    ]);
    expect(groups.applied.map((j) => j.jobId)).toEqual(["j2"]);
    expect(groups.filled.map((j) => j.jobId)).toEqual(["j3"]);
  });
});
