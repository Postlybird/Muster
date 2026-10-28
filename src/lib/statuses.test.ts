import { describe, expect, it } from "vitest";

import {
  businessStatuses,
  checkStatuses,
  jobStatuses,
  payrollStatuses,
  shiftStatuses,
  workerStatuses,
} from "./statuses";

describe("status wording", () => {
  // Every status in every list, named like "jobStatuses.posted".
  const all = Object.entries({
    workerStatuses,
    checkStatuses,
    businessStatuses,
    payrollStatuses,
    jobStatuses,
    shiftStatuses,
  }).flatMap(([list, statuses]) =>
    Object.entries(statuses).map(
      ([key, info]) => [`${list}.${key}`, info] as const,
    ),
  );

  it.each(all)("%s has a label and a 'what happens next'", (_key, info) => {
    expect(info.label.length).toBeGreaterThan(0);
    expect(info.next).toMatch(/[.]$/);
  });
});
