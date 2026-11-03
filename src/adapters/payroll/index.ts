/**
 * Payroll export (brief §4.8). v1: a CSV of a pay run's timesheets for the
 * payroll provider's timesheet import; the provider applies the award.
 * Phase 2: push timesheets through the Employment Hero Payroll API.
 *
 * The columns below are a working draft until we have the owner's
 * Employment Hero timesheet import template (see PROGRESS.md).
 */
import { csvText } from "@/lib/csv";

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
  /** Where the pay isn't just the hours worked, e.g. a minimum engagement. */
  notes: string;
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

/**
 * A CSV field: quoted when it holds a comma, quote or line break. Text
 * (names, work types, places and notes, some typed by workers and
 * businesses) can't start a spreadsheet formula (csvText()); numbers are
 * written as they are.
 */
export function csvField(value: string | number): string {
  return typeof value === "number" ? String(value) : csvText(value);
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
      "Notes",
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
        line.notes,
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
