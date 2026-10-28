import { parseSetting, type SettingKey } from "../../../src/config/settings";
import { matchJob, type MatchingSettings } from "../../../src/lib/matching";
import { must, type SeedClient } from "../client";

/** The settings matching needs, read the way the app reads them. */
export async function loadMatchingSettings(
  client: SeedClient,
): Promise<MatchingSettings> {
  const stored = new Map(
    must(await client.from("settings").select("key, value"), "settings").map(
      (row) => [row.key, row.value],
    ),
  );
  const setting = <K extends SettingKey>(key: K) =>
    parseSetting(key, stored.get(key)).value;
  return {
    daily_overtime_after_hours: setting("daily_overtime_after_hours"),
    night_hours: setting("night_hours"),
    margin_pct: setting("margin_pct"),
    on_costs_pct: setting("on_costs_pct"),
    urgent_loading_pct: setting("urgent_loading_pct"),
    gst_pct: setting("gst_pct"),
    police_check_max_age_months: setting("police_check_max_age_months"),
  };
}

/**
 * Matches demo workers to every posted job with shifts still to come, so the
 * demo's shift feeds have offers. Safe to repeat: matches are updated in place.
 */
export async function seedMatches(client: SeedClient) {
  const [jobs, settings] = await Promise.all([
    client
      .from("jobs")
      .select("id, shifts!inner(starts_at)")
      .eq("status", "posted")
      .gt("shifts.starts_at", new Date().toISOString()),
    loadMatchingSettings(client),
  ]);
  // Demo data never texts anyone, even for urgent call-outs.
  for (const job of must(jobs, "jobs")) {
    await matchJob(client, job.id, settings, { notify: false });
  }
  return { jobs: must(jobs, "jobs").length };
}
