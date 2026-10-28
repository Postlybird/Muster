/**
 * Payroll export (brief §4.8). v1: a CSV of approved timesheets for the
 * payroll provider's timesheet import; the provider applies the award.
 * Phase 2: push timesheets through the Employment Hero Payroll API.
 *
 * The columns below are a working draft and will be matched to the owner's
 * Employment Hero import template in step 1.13.
 */
export type PayrollTimesheetLine = {
  payrollEmployeeId: string;
  workerName: string;
  /** Sydney calendar date, yyyy-mm-dd. */
  date: string;
  /** Sydney wall-clock times, HH:mm. */
  start: string;
  end: string;
  breakMinutes: number;
  workType: string;
  location: string;
  allowances: { name: string; amountCents: number }[];
};

export type PayrollExport = {
  filename: string;
  contentType: "text/csv";
  body: string;
  lineCount: number;
};

export interface PayrollExporter {
  readonly name: string;
  export(lines: PayrollTimesheetLine[], periodLabel: string): PayrollExport;
}

/** Quotes a CSV field when it contains a comma, quote or line break. */
export function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** dd/mm/yyyy, as Australian payroll systems expect. */
function australianDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export class CsvPayrollExporter implements PayrollExporter {
  readonly name = "csv";

  export(lines: PayrollTimesheetLine[], periodLabel: string): PayrollExport {
    const header = [
      "Employee ID",
      "Employee",
      "Date",
      "Start",
      "End",
      "Break (minutes)",
      "Work type",
      "Location",
      "Allowances",
    ];
    const rows = lines.map((line) =>
      [
        line.payrollEmployeeId,
        line.workerName,
        australianDate(line.date),
        line.start,
        line.end,
        line.breakMinutes,
        line.workType,
        line.location,
        line.allowances
          .map((a) => `${a.name}: ${(a.amountCents / 100).toFixed(2)}`)
          .join("; "),
      ]
        .map(csvField)
        .join(","),
    );
    return {
      filename: `timesheets-${periodLabel}.csv`,
      contentType: "text/csv",
      body: [header.join(","), ...rows].join("\r\n") + "\r\n",
      lineCount: lines.length,
    };
  }
}

export function getPayrollExporter(): PayrollExporter {
  return new CsvPayrollExporter();
}
