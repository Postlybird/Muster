import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";

import type { PayrollTimesheetLine } from "@/adapters/payroll";
import {
  STATE_TIME_ZONES,
  type CostRules,
  type HoursRules,
  type ShiftCost,
  type StateCode,
} from "@/domain/pay";
import {
  costCancellation,
  invoicesFor,
  weekEndsAt,
  type InvoiceDraft,
  type Week,
} from "@/domain/pay-runs";

import { TIME_ZONE, sydneyDateKey } from "./format";
import {
  cancellationDetail,
  hoursDetail,
  lineDescription,
  payrollWorkType,
} from "./pay-run-format";
import type { Database, Json } from "./supabase/database.types";
import { workerName } from "./timesheet-format";

type Client = SupabaseClient<Database>;

/** A line as save_pay_run() takes it: one booking's hours or cancellation. */
export type PayRunLine = {
  kind: "hours" | "cancellation";
  assignment_id: string;
  timesheet_id: string | null;
  worker_id: string;
  business_id: string;
  /** The shift's day in Sydney. */
  work_date: string;
  /** What payroll pays: the hours as approved, or a cancellation's paid hours. */
  start_at: string | null;
  finish_at: string | null;
  break_minutes: number | null;
  /** Hours charged, minimum engagement included. */
  hours: number;
  work_type: string;
  site_name: string;
  /** Urgent call-out loading, paid on top. */
  allowance_cents: number;
  pay_cents: number;
  /** Excluding GST. */
  bill_cents: number;
  description: string;
  detail: string;
};

export type PayRunSettings = {
  daily_overtime_after_hours: number;
  night_hours: { start: string; end: string };
  gst_pct: number;
  invoice_payment_terms_days: number;
};

export type PayRunPlan = {
  week: Week;
  lines: PayRunLine[];
  invoices: InvoiceDraft[];
  /** Hours from the week or before still waiting for the business. */
  waiting: number;
  /** Hours queried by the business and not yet settled. */
  queried: number;
  /** Owed, but with no rates to work them out: left for a later run. */
  skipped: number;
  /** Workers being paid who have no payroll employee ID yet. */
  missingPayrollIds: string[];
};

/** PostgREST URLs have a length limit, so long id lists go in batches. */
async function inBatches<T>(
  ids: readonly string[],
  load: (batch: string[]) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    rows.push(...(await load(ids.slice(i, i + 100))));
  }
  return rows;
}

function hoursOf(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * Works out a week's run without saving it (brief §4.8): every line owed
 * from that week or before, and one invoice per business issued on
 * `issuedOn`. Approved hours are paid as costed, so cost them first
 * (costTimesheetsWith). Rates are admin-only, so `client` holds the
 * service-role key.
 */
export async function planPayRunWith(
  client: Client,
  week: Week,
  settings: PayRunSettings,
  issuedOn: string,
): Promise<PayRunPlan> {
  const until = weekEndsAt(week, TIME_ZONE).toISOString();
  const { data: candidates, error } = await client.rpc("pay_run_candidates", {
    p_until: until,
  });
  if (error) throw new Error(`Couldn't find what's owed: ${error.message}`);
  const owed = candidates ?? [];

  const [bookings, sheets, unsettled] = await Promise.all([
    inBatches(
      owed.map((c) => c.assignment_id),
      async (batch) => {
        const { data, error } = await client
          .from("assignments")
          .select(
            "id, worker_id, cancellation_charge_hours, cancellation_pay_hours, workers(preferred_name, legal_first_name, legal_last_name, payroll_employee_id), shifts(starts_at, ends_at, break_minutes, jobs(business_id, level, sites(name, state), categories(name))), assignment_rates(cost_rules), attendance_events(kind)",
          )
          .in("id", batch);
        if (error) throw new Error(`Couldn't load bookings: ${error.message}`);
        return data ?? [];
      },
    ),
    inBatches(
      owed.flatMap((c) => (c.kind === "hours" ? [c.timesheet_id] : [])),
      async (batch) => {
        const { data, error } = await client
          .from("timesheets")
          .select(
            "id, start_at, finish_at, break_minutes, timesheet_costs(start_at, finish_at, break_minutes, paid_minutes, pay_cents, bill_cents, cost)",
          )
          .in("id", batch);
        if (error) throw new Error(`Couldn't load hours: ${error.message}`);
        return data ?? [];
      },
    ),
    client
      .from("timesheets")
      .select("status")
      .in("status", ["submitted", "disputed"])
      .lt("start_at", until),
  ]);
  if (unsettled.error) {
    throw new Error(`Couldn't count hours: ${unsettled.error.message}`);
  }

  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const sheetById = new Map(sheets.map((s) => [s.id, s]));
  const cancelledStates = [
    ...new Set(
      owed.flatMap((c) =>
        c.kind === "cancellation"
          ? (bookingById.get(c.assignment_id)?.shifts?.jobs?.sites?.state ?? [])
          : [],
      ),
    ),
  ];
  const { data: holidays, error: holidaysError } = cancelledStates.length
    ? await client
        .from("public_holidays")
        .select("state, date")
        .in("state", cancelledStates)
    : { data: [], error: null };
  if (holidaysError) {
    throw new Error(`Couldn't load public holidays: ${holidaysError.message}`);
  }
  const hoursRulesFor = (state: StateCode): HoursRules => ({
    timeZone: STATE_TIME_ZONES[state],
    publicHolidays: new Set(
      (holidays ?? []).filter((h) => h.state === state).map((h) => h.date),
    ),
    overtimeAfterMinutes: Math.round(settings.daily_overtime_after_hours * 60),
    night: settings.night_hours,
  });

  const lines: PayRunLine[] = [];
  const missingPayrollIds = new Set<string>();
  let skipped = 0;
  for (const candidate of owed) {
    const booking = bookingById.get(candidate.assignment_id);
    const shift = booking?.shifts;
    const job = shift?.jobs;
    const site = job?.sites;
    if (!booking?.workers || !shift || !job || !site) {
      skipped++;
      continue;
    }
    const name = workerName(booking.workers);
    const category = job.categories?.name ?? "Work";
    const facts = {
      assignment_id: booking.id,
      worker_id: booking.worker_id,
      business_id: job.business_id,
      work_date: sydneyDateKey(shift.starts_at),
      work_type: payrollWorkType(category, job.level),
      site_name: site.name,
      description: lineDescription(name, category, site.name),
    };
    let line: PayRunLine;
    if (candidate.kind === "hours") {
      const sheet = sheetById.get(candidate.timesheet_id);
      const cost = sheet?.timesheet_costs;
      if (
        !sheet ||
        !cost ||
        cost.start_at !== sheet.start_at ||
        cost.finish_at !== sheet.finish_at ||
        cost.break_minutes !== sheet.break_minutes
      ) {
        skipped++;
        continue;
      }
      const shiftCost = cost.cost as unknown as ShiftCost;
      line = {
        ...facts,
        kind: "hours",
        timesheet_id: sheet.id,
        start_at: sheet.start_at,
        finish_at: sheet.finish_at,
        break_minutes: sheet.break_minutes,
        hours: hoursOf(cost.paid_minutes),
        allowance_cents: shiftCost.urgentPayCents ?? 0,
        pay_cents: cost.pay_cents,
        bill_cents: cost.bill_cents,
        detail: hoursDetail(
          {
            start: sheet.start_at,
            finish: sheet.finish_at,
            breakMinutes: sheet.break_minutes,
          },
          shiftCost,
        ),
      };
    } else {
      const rules = booking.assignment_rates?.cost_rules as unknown as
        CostRules | undefined;
      const state = site.state as StateCode;
      if (!rules || !(state in STATE_TIME_ZONES)) {
        skipped++;
        continue;
      }
      const arrived = booking.attendance_events.some(
        (e) => e.kind === "clock_in" || e.kind === "arrival_confirmed",
      );
      const cost = costCancellation(
        {
          shift: {
            start: new Date(shift.starts_at),
            end: new Date(shift.ends_at),
            breakMinutes: shift.break_minutes,
          },
          chargeHours: numberOrNull(booking.cancellation_charge_hours),
          payHours: numberOrNull(booking.cancellation_pay_hours),
          arrived,
        },
        hoursRulesFor(state),
        rules,
      );
      if (cost.bill.billCents === 0 && cost.pay.payCents === 0) continue;
      const paid = cost.payMinutes > 0;
      line = {
        ...facts,
        kind: "cancellation",
        timesheet_id: null,
        start_at: paid ? shift.starts_at : null,
        finish_at: paid
          ? new Date(
              Date.parse(shift.starts_at) + cost.payMinutes * 60_000,
            ).toISOString()
          : null,
        break_minutes: paid ? 0 : null,
        hours: hoursOf(cost.billMinutes),
        allowance_cents: cost.pay.urgentPayCents,
        pay_cents: cost.pay.payCents,
        bill_cents: cost.bill.billCents,
        detail: cancellationDetail(shift.starts_at, cost.bill, arrived),
      };
    }
    lines.push(line);
    if (line.pay_cents > 0 && !booking.workers.payroll_employee_id) {
      missingPayrollIds.add(name);
    }
  }
  lines.sort(
    (a, b) =>
      a.business_id.localeCompare(b.business_id) ||
      a.work_date.localeCompare(b.work_date) ||
      a.description.localeCompare(b.description),
  );

  const businessIds = [...new Set(lines.map((line) => line.business_id))];
  const terms = new Map(
    (
      await inBatches(businessIds, async (batch) => {
        const { data, error } = await client
          .from("businesses")
          .select("id, payment_terms_days")
          .in("id", batch);
        if (error) throw new Error(`Couldn't load terms: ${error.message}`);
        return data ?? [];
      })
    ).map((b) => [b.id, b.payment_terms_days]),
  );

  return {
    week,
    lines,
    invoices: invoicesFor(lines, {
      issuedOn,
      gstPct: settings.gst_pct,
      termsDays: (id) => terms.get(id) ?? settings.invoice_payment_terms_days,
    }),
    waiting: (unsettled.data ?? []).filter((t) => t.status === "submitted")
      .length,
    queried: (unsettled.data ?? []).filter((t) => t.status === "disputed")
      .length,
    skipped,
    missingPayrollIds: [...missingPayrollIds].sort(),
  };
}

/**
 * Saves a planned run (save_pay_run checks nothing changed meanwhile) and
 * returns its id. `runBy` is the admin, or null for the scheduled run.
 */
export async function savePayRunWith(
  client: Client,
  plan: PayRunPlan,
  runBy: string | null,
): Promise<string> {
  const { data, error } = await client.rpc("save_pay_run", {
    p_period_start: plan.week.start,
    p_run_by: runBy as string,
    p_invoices: plan.invoices as unknown as Json,
    p_lines: plan.lines as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** HH:mm in Sydney, as payroll imports expect. */
function clockTime(value: string): string {
  return formatInTimeZone(new Date(value), TIME_ZONE, "HH:mm");
}

/**
 * Payroll rows for a run's lines (plan question 6): the raw times, work
 * type, site and allowances of everything that pays the worker, with a
 * note where the pay isn't just the hours worked.
 */
export function payrollLines(
  rows: readonly {
    kind: "hours" | "cancellation";
    work_date: string;
    start_at: string | null;
    finish_at: string | null;
    break_minutes: number | null;
    hours: number;
    work_type: string;
    site_name: string;
    allowance_cents: number;
    pay_cents: number;
    workers: {
      legal_first_name: string | null;
      legal_last_name: string | null;
      payroll_employee_id: string | null;
    } | null;
    businesses: { legal_name: string; trading_name: string | null } | null;
  }[],
): PayrollTimesheetLine[] {
  return rows.flatMap((row) => {
    if (row.pay_cents <= 0 || !row.start_at || !row.finish_at) return [];
    const minutes =
      (Date.parse(row.finish_at) - Date.parse(row.start_at)) / 60_000 -
      (row.break_minutes ?? 0);
    const hours = Number(row.hours);
    const notes =
      row.kind === "cancellation"
        ? "Cancelled late by the business: paid, not worked"
        : hours * 60 > minutes + 0.5
          ? `Minimum engagement: pay ${hours} h`
          : "";
    const business =
      row.businesses?.trading_name ?? row.businesses?.legal_name ?? "";
    return [
      {
        payrollEmployeeId: row.workers?.payroll_employee_id ?? "",
        workerName: [
          row.workers?.legal_last_name,
          row.workers?.legal_first_name,
        ]
          .filter(Boolean)
          .join(", "),
        date: row.work_date,
        start: clockTime(row.start_at),
        end: clockTime(row.finish_at),
        breakMinutes: row.break_minutes ?? 0,
        workType: row.work_type,
        location: business ? `${business} – ${row.site_name}` : row.site_name,
        allowances:
          row.allowance_cents > 0
            ? [
                {
                  name: "Urgent call-out loading",
                  amountCents: row.allowance_cents,
                },
              ]
            : [],
        notes,
      },
    ];
  });
}
