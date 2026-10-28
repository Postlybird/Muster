import type { SupabaseClient } from "@supabase/supabase-js";

import { STATE_TIME_ZONES, type CostRules, type StateCode } from "@/domain/pay";
import { costTimesheet, PAYABLE_STATUSES } from "@/domain/timesheets";

import type { Database, Json } from "./supabase/database.types";

export type CostingSettings = {
  daily_overtime_after_hours: number;
  night_hours: { start: string; end: string };
};

/**
 * Works out pay and bill for approved hours (brief §4.8) with the rates
 * kept on each booking, and saves them. Rates and costs are admin-only, so
 * `client` holds the service-role key; the server (src/server/timesheets.ts)
 * and the seed script pass on only the result. With no ids, costs whatever
 * is waiting.
 */
export async function costTimesheetsWith(
  client: SupabaseClient<Database>,
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

  const { data: rows, error } = await client
    .from("timesheets")
    .select(
      "id, start_at, finish_at, break_minutes, assignments(assignment_rates(cost_rules)), jobs(sites(state))",
    )
    .in("id", wanted)
    .in("status", [...PAYABLE_STATUSES]);
  if (error) throw new Error(`Couldn't load hours to cost: ${error.message}`);
  const states = [
    ...new Set((rows ?? []).flatMap((row) => row.jobs?.sites?.state ?? [])),
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
  const costs = (rows ?? []).flatMap((row) => {
    const rules = row.assignments?.assignment_rates?.cost_rules as
      CostRules | undefined;
    const state = row.jobs?.sites?.state as StateCode | undefined;
    if (!rules || !state || !(state in STATE_TIME_ZONES)) {
      console.error(`Can't cost timesheet ${row.id}: its rates are missing`);
      return [];
    }
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
        overtimeAfterMinutes: Math.round(
          settings.daily_overtime_after_hours * 60,
        ),
        night: settings.night_hours,
      },
      rules,
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
  if (costs.length > 0) {
    const { error: saveError } = await client
      .from("timesheet_costs")
      .upsert(costs, { onConflict: "timesheet_id" });
    if (saveError) throw new Error(`Couldn't save costs: ${saveError.message}`);
  }
  return { costed: costs.length };
}
