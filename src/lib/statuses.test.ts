import { describe, expect, it } from "vitest";

import {
  adminInvoiceStatuses,
  businessInvoiceStatuses,
  businessStatuses,
  businessTimesheetStatuses,
  checkStatuses,
  invoiceStatus,
  jobStatuses,
  payrollStatuses,
  shiftStatuses,
  workerStatuses,
  workerTimesheetStatuses,
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
    workerTimesheetStatuses,
    businessTimesheetStatuses,
    businessInvoiceStatuses,
    adminInvoiceStatuses,
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

describe("invoice status", () => {
  const today = "2026-11-03";
  it("is paid, credited, overdue or issued", () => {
    expect(invoiceStatus({ status: "paid", due_on: "2026-10-01" }, today)).toBe(
      "paid",
    );
    expect(
      invoiceStatus({ status: "credited", due_on: "2026-10-01" }, today),
    ).toBe("credited");
    expect(
      invoiceStatus({ status: "issued", due_on: "2026-11-02" }, today),
    ).toBe("overdue");
    expect(invoiceStatus({ status: "issued", due_on: today }, today)).toBe(
      "issued",
    );
  });
});
