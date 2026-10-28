import { describe, expect, it } from "vitest";

import { CsvPayrollExporter, csvField } from "./index";

describe("payroll CSV", () => {
  it("quotes fields that need it", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvField("Smith, Jo")).toBe('"Smith, Jo"');
  });

  it("writes a header and one row per shift, with Australian dates", () => {
    const result = new CsvPayrollExporter().export(
      [
        {
          payrollEmployeeId: "EH-1001",
          workerName: "Smith, Jo",
          date: "2026-10-28",
          start: "07:00",
          end: "15:30",
          breakMinutes: 30,
          workType: "restoration_labourer",
          location: "Harbour Restoration – Parramatta",
          allowances: [{ name: "Urgent call-out", amountCents: 2500 }],
        },
      ],
      "2026-10-26_2026-11-01",
    );
    const [header, row] = result.body.trim().split("\r\n");
    expect(header).toMatch(/^Employee ID,Employee,Date,Start,End/);
    expect(row).toBe(
      'EH-1001,"Smith, Jo",28/10/2026,07:00,15:30,30,restoration_labourer,Harbour Restoration – Parramatta,Urgent call-out: 25.00',
    );
    expect(result.filename).toBe("timesheets-2026-10-26_2026-11-01.csv");
    expect(result.lineCount).toBe(1);
  });
});
