import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  ageOn,
  dateFromParts,
  dateOfBirthProblem,
  isIsoDate,
  missingSteps,
  nextStep,
  policeCheckAcceptedUntil,
  policeCheckProblem,
  previousStep,
  resumeStep,
  ticketDateProblems,
  type OnboardingSnapshot,
} from "./onboarding";

describe("steps", () => {
  it("moves forward and back through the wizard", () => {
    expect(nextStep("about")).toBe("contact");
    expect(nextStep("paperwork")).toBe("submit");
    expect(nextStep("submit")).toBeNull();
    expect(previousStep("about")).toBeNull();
    expect(previousStep("contact")).toBe("about");
  });

  it("resumes at the first unfinished step", () => {
    expect(resumeStep([])).toBe("about");
    expect(resumeStep(["about", "contact"])).toBe("travel");
    // Skipping around: the earliest gap wins.
    expect(resumeStep(["about", "travel", "right-to-work"])).toBe("contact");
  });

  it("goes to the final check once every step is done", () => {
    expect(
      resumeStep([
        "about",
        "contact",
        "travel",
        "right-to-work",
        "identity",
        "work-types",
        "tickets",
        "availability",
        "paperwork",
      ]),
    ).toBe("submit");
  });
});

describe("dates", () => {
  it("builds a date from day, month and year boxes", () => {
    expect(dateFromParts("7", "3", "1994")).toBe("1994-03-07");
    expect(dateFromParts("07", "03", "1994")).toBe("1994-03-07");
    expect(dateFromParts(" 29", "2", "2000")).toBe("2000-02-29");
  });

  it("rejects dates that don't exist or aren't numbers", () => {
    expect(dateFromParts("29", "2", "2001")).toBeNull();
    expect(dateFromParts("31", "4", "1990")).toBeNull();
    expect(dateFromParts("0", "1", "1990")).toBeNull();
    expect(dateFromParts("1", "13", "1990")).toBeNull();
    expect(dateFromParts("1", "1", "90")).toBeNull();
    expect(dateFromParts("a", "1", "1990")).toBeNull();
    expect(dateFromParts("", "", "")).toBeNull();
  });

  it("checks ISO dates", () => {
    expect(isIsoDate("2026-10-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("28/10/2026")).toBe(false);
  });

  it("works out age in whole years", () => {
    expect(ageOn("2008-10-28", "2026-10-28")).toBe(18);
    expect(ageOn("2008-10-29", "2026-10-28")).toBe(17);
    expect(ageOn("1990-01-01", "2026-10-28")).toBe(36);
  });

  it("counts a 29 February birthday from 1 March in other years", () => {
    expect(ageOn("2008-02-29", "2026-02-28")).toBe(17);
    expect(ageOn("2008-02-29", "2026-03-01")).toBe(18);
    expect(ageOn("2008-02-29", "2028-02-29")).toBe(20);
  });

  it("adds months, clamping to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-10-28", 12)).toBe("2027-10-28");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("date of birth", () => {
  const today = "2026-10-28";

  it("accepts someone old enough", () => {
    expect(dateOfBirthProblem("2008-10-28", today, 18)).toBeNull();
  });

  it("explains the minimum age", () => {
    expect(dateOfBirthProblem("2008-10-29", today, 18)).toBe(
      "You need to be at least 18 to work with us",
    );
  });

  it("catches obvious typos", () => {
    expect(dateOfBirthProblem(today, today, 18)).toMatch(/not today/);
    expect(dateOfBirthProblem("1900-01-01", today, 18)).toMatch(/year/);
  });
});

describe("ticket dates", () => {
  const today = "2026-10-28";

  it("accepts sensible dates", () => {
    expect(
      ticketDateProblems(
        { issuedOn: "2025-01-01", expiresOn: "2027-01-01" },
        today,
        { needsExpiry: true },
      ),
    ).toEqual({});
  });

  it("needs an expiry date for tickets that expire", () => {
    expect(
      ticketDateProblems({ issuedOn: null, expiresOn: null }, today, {
        needsExpiry: true,
      }),
    ).toEqual({ expires_on: "Enter the expiry date" });
    expect(
      ticketDateProblems({ issuedOn: null, expiresOn: null }, today, {
        needsExpiry: false,
      }),
    ).toEqual({});
  });

  it("refuses expired tickets and future issue dates", () => {
    const problems = ticketDateProblems(
      { issuedOn: "2027-01-01", expiresOn: "2026-10-27" },
      today,
      { needsExpiry: true },
    );
    expect(problems.issued_on).toMatch(/future/);
    expect(problems.expires_on).toMatch(/expired/);
  });

  it("accepts a ticket that expires today", () => {
    expect(
      ticketDateProblems({ issuedOn: null, expiresOn: today }, today, {
        needsExpiry: true,
      }),
    ).toEqual({});
  });

  it("catches an expiry before the issue date", () => {
    expect(
      ticketDateProblems(
        { issuedOn: "2026-10-01", expiresOn: "2026-10-28" },
        "2026-09-01",
        { needsExpiry: true },
      ),
    ).toEqual({ issued_on: "The issue date can't be in the future" });
    expect(
      ticketDateProblems(
        { issuedOn: "2026-10-01", expiresOn: "2026-10-28" },
        "2026-10-28",
        { needsExpiry: true },
      ),
    ).toEqual({});
  });
});

describe("police checks", () => {
  it("are accepted for the maximum age from the issue date", () => {
    expect(policeCheckAcceptedUntil("2026-01-15", 12)).toBe("2027-01-14");
    expect(policeCheckProblem("2025-10-29", "2026-10-28", 12)).toBeNull();
    expect(policeCheckProblem("2025-10-28", "2026-10-28", 12)).toMatch(
      /last 12 months/,
    );
  });

  it("need an issue date in the past", () => {
    expect(policeCheckProblem(null, "2026-10-28", 12)).toMatch(/Enter/);
    expect(policeCheckProblem("2026-11-01", "2026-10-28", 12)).toMatch(
      /future/,
    );
  });
});

describe("missing steps", () => {
  const complete: OnboardingSnapshot = {
    legalFirstName: "Ann",
    legalLastName: "Example",
    dateOfBirth: "1990-01-01",
    photoPath: "w/photo.jpg",
    email: "ann@example.test",
    phone: "+61491570001",
    homeSuburb: "Parramatta",
    hasRightToWork: true,
    hasIdentityCheck: true,
    categoryCount: 1,
    unacceptedDocuments: 0,
  };

  it("is empty when everything required is done", () => {
    expect(missingSteps(complete)).toEqual([]);
  });

  it("lists what's missing in wizard order", () => {
    expect(
      missingSteps({
        ...complete,
        photoPath: null,
        email: null,
        categoryCount: 0,
        unacceptedDocuments: 2,
      }),
    ).toEqual(["about", "contact", "work-types", "paperwork"]);
  });
});
