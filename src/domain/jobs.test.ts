import { describe, expect, it } from "vitest";

import {
  datesInRange,
  datesProblem,
  isOvernightShift,
  missingPostSteps,
  postingBlocker,
  resumePostStep,
  safetyProblem,
  shiftLengthMinutes,
  shiftTimesProblem,
  urgentStartAt,
  weekdayOf,
} from "./jobs";

describe("post-work steps", () => {
  it("resumes at the first step not done", () => {
    expect(resumePostStep([])).toBe("what");
    expect(resumePostStep(["what", "when"])).toBe("needs");
    expect(resumePostStep(["what", "when", "needs", "safety"])).toBe("review");
    // A copied job has everything but the dates.
    expect(resumePostStep(["what", "needs", "safety"])).toBe("when");
    expect(resumePostStep(["what", "needs", "safety", "when"])).toBe("review");
  });
});

describe("dates", () => {
  it("knows the day of the week", () => {
    expect(weekdayOf("2026-11-02")).toBe(1); // Monday
    expect(weekdayOf("2026-11-08")).toBe(0); // Sunday
  });

  it("lists weekdays in a range, like Monday to Friday for two weeks", () => {
    const dates = datesInRange("2026-11-02", "2026-11-15", [1, 2, 3, 4, 5]);
    expect(dates).toHaveLength(10);
    expect(dates[0]).toBe("2026-11-02");
    expect(dates.at(-1)).toBe("2026-11-13");
  });

  it("checks dates are ahead and not too many", () => {
    expect(datesProblem([], "2026-11-01")).toMatch(/at least one day/);
    expect(datesProblem(["2026-10-31"], "2026-11-01")).toMatch(/passed/);
    expect(datesProblem(["2027-06-01"], "2026-11-01")).toMatch(/180 days/);
    expect(datesProblem(["2026-11-01", "2026-11-02"], "2026-11-01")).toBeNull();
    const many = datesInRange(
      "2026-11-02",
      "2027-01-31",
      [0, 1, 2, 3, 4, 5, 6],
    );
    expect(datesProblem(many, "2026-11-01")).toMatch(/up to 40 shifts/);
  });
});

describe("shift times", () => {
  it("treats a finish before the start as the next morning", () => {
    expect(shiftLengthMinutes("07:00", "15:30")).toBe(510);
    expect(shiftLengthMinutes("22:00", "06:00")).toBe(480);
    expect(isOvernightShift("22:00", "06:00")).toBe(true);
    expect(isOvernightShift("07:00", "15:30")).toBe(false);
  });

  it("checks the times and break", () => {
    expect(shiftTimesProblem("07:00", "15:30", 30)).toBeNull();
    expect(shiftTimesProblem("", "15:30", 30)).toMatch(/start time/);
    expect(shiftTimesProblem("06:00", "21:00", 30)).toMatch(/up to 14 hours/);
    expect(shiftTimesProblem("07:00", "08:00", 60)).toMatch(
      /shorter than the shift/,
    );
    expect(shiftTimesProblem("07:00", "15:00", 150)).toMatch(
      /up to 120 minutes/,
    );
    expect(shiftTimesProblem("07:00", "15:00", 2.5)).toMatch(/whole minutes/);
    // Same start and finish would be a 24-hour shift.
    expect(shiftTimesProblem("07:00", "07:00", 0)).toMatch(/up to 14 hours/);
  });
});

describe("before posting", () => {
  it("needs the hazards section filled in", () => {
    expect(
      safetyProblem({ hazardCount: 0, noKnownHazards: false, controls: "" }),
    ).toMatch(/Tick the hazards/);
    expect(
      safetyProblem({ hazardCount: 0, noKnownHazards: true, controls: "" }),
    ).toBeNull();
    expect(
      safetyProblem({ hazardCount: 2, noKnownHazards: false, controls: " " }),
    ).toMatch(/controls/);
    expect(
      safetyProblem({ hazardCount: 1, noKnownHazards: true, controls: "x" }),
    ).toMatch(/one or the other/);
    expect(
      safetyProblem({
        hazardCount: 1,
        noKnownHazards: false,
        controls: "Asbestos removalist cleared the area",
      }),
    ).toBeNull();
  });

  it("lists the steps still missing", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    const ready = {
      siteId: "s",
      categoryId: "c",
      shiftCount: 1,
      firstStart: new Date("2026-11-02T00:00:00Z"),
      hazardCount: 0,
      noKnownHazards: true,
      controls: "",
    };
    expect(missingPostSteps(ready, now)).toEqual([]);
    expect(
      missingPostSteps(
        { ...ready, siteId: null, shiftCount: 0, noKnownHazards: false },
        now,
      ),
    ).toEqual(["what", "when", "safety"]);
    expect(
      missingPostSteps(
        { ...ready, firstStart: new Date("2026-10-31T23:00:00Z") },
        now,
      ),
    ).toEqual(["when"]);
  });

  it("says why a business can't post yet", () => {
    const ok = {
      status: "approved",
      accountTermsApproved: true,
      agreementAccepted: true,
    };
    expect(postingBlocker(ok)).toBeNull();
    expect(postingBlocker({ ...ok, status: "pending" })).toMatch(/approved/);
    expect(postingBlocker({ ...ok, accountTermsApproved: false })).toMatch(
      /account terms/,
    );
    expect(postingBlocker({ ...ok, agreementAccepted: false })).toMatch(
      /Agreement/,
    );
  });
});

describe("urgent call-outs", () => {
  it("start an hour from now, on the quarter hour", () => {
    expect(urgentStartAt(new Date("2026-11-01T03:07:00Z")).toISOString()).toBe(
      "2026-11-01T04:15:00.000Z",
    );
    expect(urgentStartAt(new Date("2026-11-01T03:00:00Z")).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
  });
});
