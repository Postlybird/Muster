import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { parseSetting, type SettingKey } from "../../../src/config/settings";
import {
  hourlyBillCents,
  STATE_TIME_ZONES,
  type StateCode,
} from "../../../src/domain/pay";
import { makePricer } from "../../../src/domain/pricing";
import { hourlyPayCents } from "../../../src/domain/rates";
import { loadPricingData } from "../../../src/lib/pricing";
import type { Json } from "../../../src/lib/supabase/database.types";
import { costTimesheetsWith } from "../../../src/lib/timesheet-costing";
import { check, must, type SeedClient } from "../client";
import { DEMO_WORKED } from "../data/worked";

const DAY = 86_400_000;

/**
 * Shifts already worked, with clock-ins and timesheets: some waiting for
 * the business, one approved and costed, one queried. Bookings, clock-ins
 * and timesheets go in directly (the app only books shifts still to come),
 * through the same triggers that make timesheets at clock-out. A business
 * that already has timesheets is left alone.
 */
export async function seedWorked(client: SeedClient) {
  const now = new Date();
  const [businesses, sites, categories, workers, settingsRows, existing] =
    await Promise.all([
      client
        .from("businesses")
        .select("id, trading_name, created_by")
        .is("archived_at", null),
      client
        .from("sites")
        .select(
          "id, business_id, name, state, lat, lng, report_to_name, report_to_phone",
        )
        .is("archived_at", null),
      client.from("categories").select("id, code, default_level"),
      client
        .from("workers")
        .select("id, profile_id, legal_first_name, legal_last_name"),
      client.from("settings").select("key, value"),
      client.from("timesheets").select("jobs!inner(business_id)"),
    ]);
  const stored = new Map(
    must(settingsRows, "settings").map((row) => [row.key, row.value]),
  );
  const setting = <K extends SettingKey>(key: K) =>
    parseSetting(key, stored.get(key)).value;
  const settings = {
    daily_overtime_after_hours: setting("daily_overtime_after_hours"),
    night_hours: setting("night_hours"),
    margin_pct: setting("margin_pct"),
    on_costs_pct: setting("on_costs_pct"),
    urgent_loading_pct: setting("urgent_loading_pct"),
    gst_pct: setting("gst_pct"),
  };
  const hasHours = new Set(
    must(existing, "timesheets").map((row) => row.jobs.business_id),
  );
  const workerId = new Map(
    must(workers, "workers").map((w) => [
      `${w.legal_first_name} ${w.legal_last_name}`,
      w.id,
    ]),
  );
  const profileOf = new Map(
    must(workers, "workers").map((w) => [w.id, w.profile_id]),
  );

  let shifts = 0;
  for (const demo of DEMO_WORKED) {
    const business = must(businesses, "businesses").find(
      (b) => b.trading_name === demo.business,
    );
    if (!business || hasHours.has(business.id)) continue;
    const site = must(sites, "sites").find(
      (s) => s.business_id === business.id && s.name === demo.site,
    );
    const category = must(categories, "categories").find(
      (c) => c.code === demo.category,
    );
    if (!site || !category) {
      throw new Error(
        `Worked shift for ${demo.business}: unknown site or work type`,
      );
    }
    const state = site.state as StateCode;
    const timeZone = STATE_TIME_ZONES[state];
    const date = formatInTimeZone(
      new Date(now.getTime() - demo.daysAgo * DAY),
      timeZone,
      "yyyy-MM-dd",
    );
    const at = (time: string) => fromZonedTime(`${date}T${time}:00`, timeZone);
    const start = at(demo.start);
    const end = at(demo.end);
    const scope = {
      businessId: business.id,
      categoryId: category.id,
      level: category.default_level,
      state,
    };
    const quote = makePricer(scope, {
      ...(await loadPricingData(client, scope)),
      settings,
    }).quote({ start, end, breakMinutes: demo.breakMinutes, urgent: false });
    if (!quote.ok) throw new Error(`Worked shift: ${quote.problem}`);

    const job = must(
      await client
        .from("jobs")
        .insert({
          business_id: business.id,
          site_id: site.id,
          category_id: category.id,
          level: category.default_level,
          type: "single",
          headcount: demo.workers.length,
          fill_mode: "pick",
          instructions: "Demo work that has already happened.",
          report_to_name: site.report_to_name,
          report_to_phone: site.report_to_phone,
          no_known_hazards: true,
          ppe_supplied_by: "business",
          estimate_cents: quote.cost.billCents * demo.workers.length,
          steps: ["what", "when", "needs", "safety", "review"],
          status: "completed",
          posted_at: new Date(start.getTime() - 3 * DAY).toISOString(),
          posted_by: business.created_by,
          created_by: business.created_by,
        })
        .select("id")
        .single(),
      `worked job for ${demo.business}`,
    );
    const shift = must(
      await client
        .from("shifts")
        .insert({
          job_id: job.id,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          break_minutes: demo.breakMinutes,
          headcount: demo.workers.length,
          status: "completed",
        })
        .select("id")
        .single(),
      "worked shift",
    );

    for (const person of demo.workers) {
      const worker = workerId.get(person.name);
      if (!worker) throw new Error(`Unknown demo worker ${person.name}`);
      check(
        await client.from("applications").insert({
          shift_id: shift.id,
          worker_id: worker,
          status: "booked",
          decided_at: new Date(start.getTime() - 2 * DAY).toISOString(),
        }),
        "worked application",
      );
      const booking = must(
        await client
          .from("assignments")
          .insert({
            shift_id: shift.id,
            worker_id: worker,
            confirmed_at: new Date(start.getTime() - 2 * DAY).toISOString(),
            confirmed_by: business.created_by,
          })
          .select("id")
          .single(),
        "worked booking",
      );
      const { rules, cost } = quote;
      check(
        await client.from("assignment_rates").insert({
          assignment_id: booking.id,
          rate_card_id: quote.card.id,
          bill_rate_rule_id: quote.billRule?.id ?? null,
          cost_rules: rules as unknown as NonNullable<Json>,
          pay_hourly_cents: hourlyPayCents(rules.card, "ordinary"),
          bill_hourly_cents: hourlyBillCents(
            rules.card,
            rules.billRule,
            rules.onCostPct,
            "ordinary",
          ),
          estimate_pay_cents: cost.payCents,
          estimate_bill_cents: cost.billCents,
          estimate_margin_cents: cost.marginCents,
        }),
        "worked booking rates",
      );
      // At the site; a clock-out makes the timesheet (the database's trigger).
      const place = {
        lat: site.lat,
        lng: site.lng,
        accuracy_m: 12,
        distance_m: 0,
        inside_geofence: true,
      };
      check(
        await client.from("attendance_events").insert([
          {
            assignment_id: booking.id,
            kind: "clock_in" as const,
            occurred_at: at(person.clockIn).toISOString(),
            ...place,
          },
          ...(person.clockOut
            ? [
                {
                  assignment_id: booking.id,
                  kind: "clock_out" as const,
                  occurred_at: at(person.clockOut).toISOString(),
                  ...place,
                },
              ]
            : []),
        ]),
        "worked clock-ins",
      );
    }
    // No clock-out: the rostered finish, as the scheduled job would do.
    check(await client.rpc("record_missing_timesheets"), "missing timesheets");

    const sheets = must(
      await client
        .from("timesheets")
        .select("id, assignment_id, worker_id")
        .eq("job_id", job.id),
      "worked timesheets",
    );
    const approved: string[] = [];
    for (const person of demo.workers) {
      const sheet = sheets.find(
        (s) => s.worker_id === workerId.get(person.name),
      );
      if (!sheet) continue;
      const stamp = now.toISOString();
      if (person.outcome === "approved") {
        check(
          await client
            .from("timesheets")
            .update({
              status: "approved",
              approved_by: business.created_by,
              approved_at: stamp,
            })
            .eq("id", sheet.id),
          "approved timesheet",
        );
        approved.push(sheet.id);
      } else if (person.outcome === "disputed") {
        check(
          await client
            .from("timesheets")
            .update({
              status: "disputed",
              business_note: person.note ?? null,
              disputed_by: business.created_by,
              disputed_at: stamp,
            })
            .eq("id", sheet.id),
          "queried timesheet",
        );
        check(
          await client.from("admin_flags").insert({
            kind: "timesheet_dispute",
            worker_id: sheet.worker_id,
            business_id: business.id,
            assignment_id: sheet.assignment_id,
            summary: `${demo.business} queried the hours at ${demo.site}: ${person.note ?? ""}`,
          }),
          "query flag",
        );
      }
    }
    // Demo hours don't need "ready to approve" emails.
    check(
      await client
        .from("timesheets")
        .update({ business_notified_at: now.toISOString() })
        .eq("job_id", job.id),
      "timesheet notices",
    );
    await costTimesheetsWith(client, settings, approved);

    // Ratings both ways for approved hours, and the averages they make.
    for (const person of demo.workers) {
      const sheet = sheets.find(
        (s) => s.worker_id === workerId.get(person.name),
      );
      if (!sheet || !person.ratings) continue;
      const common = {
        assignment_id: sheet.assignment_id,
        worker_id: sheet.worker_id,
        business_id: business.id,
        site_id: site.id,
      };
      check(
        await client.from("ratings").insert([
          {
            ...common,
            direction: "worker" as const,
            score: person.ratings.worker.score,
            tags: person.ratings.worker.tags,
            private_note: person.ratings.worker.note ?? null,
            rated_by: business.created_by!,
          },
          {
            ...common,
            direction: "site" as const,
            score: person.ratings.site.score,
            tags: person.ratings.site.tags,
            private_note: person.ratings.site.note ?? null,
            rated_by: profileOf.get(sheet.worker_id)!,
          },
        ]),
        "demo ratings",
      );
      await updateAverages(client, sheet.worker_id, business.id);
    }
    shifts++;
  }
  return { shifts };
}

/** The averages rate_worker() and rate_site() keep, for seeded ratings. */
async function updateAverages(
  client: SeedClient,
  workerId: string,
  businessId: string,
) {
  const average = (rows: { score: number }[]) => ({
    rating_avg: rows.length
      ? Math.round(
          (rows.reduce((sum, row) => sum + row.score, 0) / rows.length) * 100,
        ) / 100
      : null,
    rating_count: rows.length,
  });
  const [forWorker, forBusiness] = await Promise.all([
    client
      .from("ratings")
      .select("score")
      .eq("worker_id", workerId)
      .eq("direction", "worker"),
    client
      .from("ratings")
      .select("score")
      .eq("business_id", businessId)
      .eq("direction", "site"),
  ]);
  check(
    await client
      .from("workers")
      .update(average(must(forWorker, "worker ratings")))
      .eq("id", workerId),
    "worker rating",
  );
  check(
    await client
      .from("businesses")
      .update(average(must(forBusiness, "business ratings")))
      .eq("id", businessId),
    "business rating",
  );
}
