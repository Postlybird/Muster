import type { SupabaseClient } from "@supabase/supabase-js";

import { priorHours, weekStart, type BookedHours } from "@/domain/overtime";
import { STATE_TIME_ZONES, type CostRules, type StateCode } from "@/domain/pay";
import { costTimesheet, PAYABLE_STATUSES } from "@/domain/timesheets";

import type { Database, Json } from "./supabase/database.types";

type Client = SupabaseClient<Database>;

export type CostingSettings = {
  daily_overtime_after_hours: number;
  /** Absent: no weekly limit. */
  weekly_overtime_after_hours?: number;
  night_hours: { start: string; end: string };
};

/** Ids are read in batches, so a request's address stays short. */
const BATCH = 200;

function batches<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    out.push(items.slice(i, i + BATCH));
  }
  return out;
}

const SELECT =
  "id, worker_id, assignment_id, start_at, finish_at, break_minutes, assignments(shift_id, created_at, shifts(starts_at), assignment_rates(cost_rules)), jobs(sites(state)), pay_run_lines(id)";

async function loadPayable(
  client: Client,
  column: "id" | "assignment_id",
  values: readonly string[],
) {
  const rows = [];
  for (const batch of batches(values)) {
    const { data, error } = await client
      .from("timesheets")
      .select(SELECT)
      .in(column, batch)
      .in("status", [...PAYABLE_STATUSES]);
    if (error) throw new Error(`Couldn't load hours to cost: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

type Row = Awaited<ReturnType<typeof loadPayable>>[number];

/**
 * Works out pay and bill for approved hours (brief §4.8) with the rates
 * kept on each booking, and saves them. A worker's hours with us add up
 * across their week (owner, 02/11/2026): each timesheet counts the hours of
 * shifts booked before it that day and week (src/domain/overtime.ts), so the
 * business whose booking went past a limit is charged the overtime. Costing
 * some hours costs the worker's other unpaid hours that week again too, as
 * theirs may change with them.
 *
 * Rates and costs are admin-only, so `client` holds the service-role key;
 * the server (src/server/timesheets.ts) and the seed script pass on only the
 * result. With no ids, costs whatever is waiting.
 */
export async function costTimesheetsWith(
  client: Client,
  settings: CostingSettings,
  ids?: readonly string[],
): Promise<{ costed: number }> {
  let wanted = ids ? [...new Set(ids)] : null;
  if (!wanted) {
    const { data, error } = await client.rpc("timesheets_to_cost");
    if (error) throw new Error(`Couldn't find hours to cost: ${error.message}`);
    wanted = (data ?? []).map((row) => row.timesheet_id);
  }
  if (wanted.length === 0) return { costed: 0 };

  const first = await loadPayable(client, "id", wanted);
  if (first.length === 0) return { costed: 0 };

  // Every booking of these workers around these weeks: when it was booked,
  // its local day and its hours.
  const starts = first.flatMap((row) =>
    row.assignments?.shifts
      ? [Date.parse(row.assignments.shifts.starts_at)]
      : [],
  );
  const from = new Date(Math.min(...starts) - 9 * 86_400_000);
  const to = new Date(Math.max(...starts) + 9 * 86_400_000);
  const workerIds = [...new Set(first.map((row) => row.worker_id))];
  const booked = new Map<string, BookedHours[]>();
  const dayOf = new Map<string, string>();
  for (const batch of batches(workerIds)) {
    const { data, error } = await client.rpc("worker_booked_minutes", {
      p_worker_ids: batch,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });
    if (error) throw new Error(`Couldn't load booked hours: ${error.message}`);
    for (const row of data ?? []) {
      const list = booked.get(row.worker_id) ?? [];
      list.push({
        shiftId: row.shift_id,
        bookedAt: row.booked_at,
        day: row.day,
        minutes: row.minutes,
      });
      booked.set(row.worker_id, list);
      dayOf.set(row.assignment_id, row.day);
    }
  }

  // The workers' other approved hours in the same weeks.
  const weeks = new Set(
    first.flatMap((row) => {
      const day = dayOf.get(row.assignment_id);
      return day ? [`${row.worker_id}:${weekStart(day)}`] : [];
    }),
  );
  const peers = [...dayOf.entries()]
    .filter(([, day]) => [...weeks].some((key) => key.endsWith(weekStart(day))))
    .map(([assignmentId]) => assignmentId);
  const loaded = new Map<string, Row>(first.map((row) => [row.id, row]));
  for (const row of await loadPayable(client, "assignment_id", peers)) {
    const day = dayOf.get(row.assignment_id);
    if (day && weeks.has(`${row.worker_id}:${weekStart(day)}`)) {
      loaded.set(row.id, row);
    }
  }
  // Paid hours are locked.
  const rows = [...loaded.values()].filter((row) =>
    Array.isArray(row.pay_run_lines)
      ? row.pay_run_lines.length === 0
      : !row.pay_run_lines,
  );

  const states = [
    ...new Set(rows.flatMap((row) => row.jobs?.sites?.state ?? [])),
  ];
  const { data: holidays, error: holidaysError } = states.length
    ? await client
        .from("public_holidays")
        .select("state, date")
        .in("state", states)
    : { data: [], error: null };
  if (holidaysError) {
    throw new Error(`Couldn't load public holidays: ${holidaysError.message}`);
  }

  const costedAt = new Date().toISOString();
  const dailyDefault = Math.round(settings.daily_overtime_after_hours * 60);
  const costs = rows.flatMap((row) => {
    const rules = row.assignments?.assignment_rates?.cost_rules as
      CostRules | undefined;
    const state = row.jobs?.sites?.state as StateCode | undefined;
    const day = dayOf.get(row.assignment_id);
    if (!rules || !state || !(state in STATE_TIME_ZONES) || !row.assignments) {
      console.error(`Can't cost timesheet ${row.id}: its rates are missing`);
      return [];
    }
    const prior = day
      ? priorHours(
          {
            shiftId: row.assignments.shift_id,
            bookedAt: row.assignments.created_at,
            day,
          },
          booked.get(row.worker_id) ?? [],
          rules.card.award?.overtimeAfterMinutes ?? dailyDefault,
        )
      : undefined;
    const { minutes, cost } = costTimesheet(
      {
        start: new Date(row.start_at),
        finish: new Date(row.finish_at),
        breakMinutes: row.break_minutes,
      },
      {
        timeZone: STATE_TIME_ZONES[state],
        publicHolidays: new Set(
          (holidays ?? []).filter((h) => h.state === state).map((h) => h.date),
        ),
        overtimeAfterMinutes: dailyDefault,
        weeklyOvertimeAfterMinutes:
          settings.weekly_overtime_after_hours === undefined
            ? undefined
            : Math.round(settings.weekly_overtime_after_hours * 60),
        night: settings.night_hours,
      },
      rules,
      prior,
    );
    return [
      {
        timesheet_id: row.id,
        start_at: row.start_at,
        finish_at: row.finish_at,
        break_minutes: row.break_minutes,
        minutes_by_type: minutes as unknown as NonNullable<Json>,
        cost: cost as unknown as NonNullable<Json>,
        paid_minutes: cost.paidMinutes,
        pay_cents: cost.payCents,
        on_cost_cents: cost.onCostCents,
        bill_cents: cost.billCents,
        margin_cents: cost.marginCents,
        costed_at: costedAt,
      },
    ];
  });
  for (const batch of batches(costs)) {
    const { error: saveError } = await client
      .from("timesheet_costs")
      .upsert(batch, { onConflict: "timesheet_id" });
    if (saveError) throw new Error(`Couldn't save costs: ${saveError.message}`);
  }
  return { costed: costs.length };
}
