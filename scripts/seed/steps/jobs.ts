import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { parseSetting, type SettingKey } from "../../../src/config/settings";
import { STATE_TIME_ZONES, type StateCode } from "../../../src/domain/pay";
import { makePricer } from "../../../src/domain/pricing";
import { check, must, type SeedClient } from "../client";
import { DEMO_JOBS } from "../data/jobs";

const DAY = 86_400_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

/** `count` weekdays starting on or after `first`. */
function weekdaysFrom(first: string, count: number): string[] {
  const dates: string[] = [];
  for (let date = first; dates.length < count; date = addDays(date, 1)) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (day !== 0 && day !== 6) dates.push(date);
  }
  return dates;
}

/**
 * Posts the demo jobs, priced with the same engine as the app. A business
 * that already has upcoming work is left alone, so running the seed again
 * only tops up businesses whose demo shifts have passed.
 */
export async function seedJobs(client: SeedClient) {
  const now = new Date();
  const [
    businesses,
    sites,
    categories,
    hazards,
    settingsRows,
    cards,
    rules,
    holidays,
    upcoming,
    templates,
  ] = await Promise.all([
    client
      .from("businesses")
      .select("id, trading_name, status, account_terms_approved, created_by")
      .is("archived_at", null),
    client
      .from("sites")
      .select("id, business_id, name, state, report_to_name, report_to_phone")
      .is("archived_at", null),
    client
      .from("categories")
      .select(
        "id, code, default_level, police_check_required, min_engagement_hours, workers_comp_pct, category_credentials(credential_type_id), category_ppe(ppe_item_id)",
      ),
    client.from("hazards").select("id, code"),
    client.from("settings").select("key, value"),
    client.from("rate_cards").select("*").is("archived_at", null),
    client.from("bill_rate_rules").select("*").is("archived_at", null),
    client.from("public_holidays").select("state, date"),
    client
      .from("shifts")
      .select("jobs!inner(business_id, status)")
      .gt("starts_at", now.toISOString())
      .eq("jobs.status", "posted"),
    client
      .from("job_templates")
      .select("business_id, name")
      .is("archived_at", null),
  ]);
  const busy = new Set(
    must(upcoming, "upcoming shifts").map((shift) => shift.jobs.business_id),
  );
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
  const hazardIds = new Map(
    must(hazards, "hazards").map((hazard) => [hazard.code, hazard.id]),
  );

  let added = 0;
  for (const demo of DEMO_JOBS) {
    const business = must(businesses, "businesses").find(
      (b) => b.trading_name === demo.business,
    );
    if (
      !business ||
      business.status !== "approved" ||
      !business.account_terms_approved ||
      busy.has(business.id)
    ) {
      continue;
    }
    const site = must(sites, "sites").find(
      (s) => s.business_id === business.id && s.name === demo.site,
    );
    const category = must(categories, "categories").find(
      (c) => c.code === demo.category,
    );
    if (!site || !category) {
      throw new Error(
        `Demo job for ${demo.business}: unknown site or work type`,
      );
    }

    const state = site.state as StateCode;
    const timeZone = STATE_TIME_ZONES[state];
    const first = addDays(
      formatInTimeZone(now, timeZone, "yyyy-MM-dd"),
      demo.startInDays,
    );
    const dates =
      demo.type === "multi_day" ? weekdaysFrom(first, demo.days ?? 5) : [first];
    const shifts = dates.map((date) => {
      const start = fromZonedTime(`${date}T${demo.start}:00`, timeZone);
      let end = fromZonedTime(`${date}T${demo.end}:00`, timeZone);
      if (end <= start) end = new Date(end.getTime() + DAY);
      return {
        start,
        end,
        breakMinutes: demo.breakMinutes,
        urgent: demo.type === "urgent",
      };
    });
    const estimate = makePricer(
      {
        businessId: business.id,
        categoryId: category.id,
        level: category.default_level,
        state,
      },
      {
        cards: must(cards, "rate cards"),
        rules: must(rules, "bill rules"),
        publicHolidays: must(holidays, "public holidays")
          .filter((holiday) => holiday.state === state)
          .map((holiday) => holiday.date),
        category,
        settings,
      },
    ).estimate(shifts, demo.headcount);

    const job = must(
      await client
        .from("jobs")
        .insert({
          business_id: business.id,
          site_id: site.id,
          category_id: category.id,
          level: category.default_level,
          type: demo.type,
          headcount: demo.headcount,
          fill_mode: demo.fillMode,
          favourites_first_minutes: demo.favouritesFirstMinutes ?? null,
          police_check_required: category.police_check_required,
          instructions: demo.instructions,
          report_to_name: site.report_to_name,
          report_to_phone: site.report_to_phone,
          no_known_hazards: demo.hazards.length === 0,
          hazard_controls: demo.controls ?? "",
          induction: demo.induction ?? "",
          ppe_supplied_by: demo.ppeSuppliedBy,
          estimate_cents: estimate.ok ? estimate.totals.billCents : null,
          estimate_gst_cents: estimate.ok ? estimate.totals.gstCents : null,
          steps: ["what", "when", "needs", "safety", "review"],
          status: "posted",
          posted_at: now.toISOString(),
          posted_by: business.created_by,
          created_by: business.created_by,
        })
        .select("id")
        .single(),
      `demo job for ${demo.business}`,
    );

    check(
      await client.from("shifts").insert(
        shifts.map((shift) => ({
          job_id: job.id,
          starts_at: shift.start.toISOString(),
          ends_at: shift.end.toISOString(),
          break_minutes: shift.breakMinutes,
          headcount: demo.headcount,
        })),
      ),
      "demo shifts",
    );
    const tickets = category.category_credentials.map((link) => ({
      job_id: job.id,
      credential_type_id: link.credential_type_id,
    }));
    if (tickets.length > 0) {
      check(
        await client.from("job_credentials").insert(tickets),
        "job tickets",
      );
    }
    if (demo.hazards.length > 0) {
      check(
        await client.from("job_hazards").insert(
          demo.hazards.map((code) => {
            const hazardId = hazardIds.get(code);
            if (!hazardId) throw new Error(`Unknown hazard ${code}`);
            return { job_id: job.id, hazard_id: hazardId };
          }),
        ),
        "job hazards",
      );
    }
    const ppe = category.category_ppe.map((link) => ({
      job_id: job.id,
      ppe_item_id: link.ppe_item_id,
    }));
    if (ppe.length > 0) {
      check(await client.from("job_ppe").insert(ppe), "job PPE");
    }
    const hasTemplate = must(templates, "templates").some(
      (t) => t.business_id === business.id && t.name === demo.template,
    );
    if (demo.template && !hasTemplate) {
      check(
        await client.from("job_templates").insert({
          business_id: business.id,
          job_id: job.id,
          name: demo.template,
          created_by: business.created_by,
        }),
        "job template",
      );
    }
    added++;
  }
  return { jobs: DEMO_JOBS.length, added };
}
