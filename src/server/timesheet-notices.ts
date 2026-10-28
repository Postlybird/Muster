import "server-only";

import { formatDateTime, formatDayShort } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoursLabel, workerName } from "@/lib/timesheet-format";

import { notify } from "./notifications";
import { getAllSettings } from "./settings";

/**
 * Messages about timesheets (brief §4.6) to the worker and whoever posted
 * the job (src/config/notifications.ts has their words). These look up who
 * to tell with the service-role key.
 */

async function loadTimesheets(ids: readonly string[]) {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("timesheets")
    .select(
      "id, start_at, finish_at, break_minutes, recorded_finish, approve_by, status, business_note, worker_note, resolution, workers(profile_id, preferred_name, legal_first_name, legal_last_name), jobs(posted_by, categories(name), sites(name), businesses(trading_name, legal_name)), assignments(shifts(starts_at))",
    )
    .in("id", [...ids]);
  if (error) throw new Error(`Couldn't load timesheets: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    name: row.workers ? workerName(row.workers) : "A worker",
    profileId: row.workers?.profile_id ?? null,
    postedBy: row.jobs?.posted_by ?? null,
    site: row.jobs?.sites?.name ?? "the site",
    business:
      row.jobs?.businesses?.trading_name ??
      row.jobs?.businesses?.legal_name ??
      "The business",
    day: formatDayShort(row.assignments?.shifts?.starts_at ?? row.start_at),
  }));
}

type Loaded = Awaited<ReturnType<typeof loadTimesheets>>[number];

/** Groups timesheets by whoever posted the job. */
function byPoster(rows: readonly Loaded[]) {
  const groups = new Map<string, Loaded[]>();
  for (const row of rows) {
    if (!row.postedBy) continue;
    groups.set(row.postedBy, [...(groups.get(row.postedBy) ?? []), row]);
  }
  return groups;
}

function line(row: Loaded): string {
  const noClockOut =
    row.recorded_finish === null && row.status === "submitted"
      ? " (no clock-out, so the rostered finish)"
      : "";
  return `- ${row.name}, ${row.day} at ${row.site}: ${hoursLabel(row)}${noClockOut}`;
}

/**
 * Tells whoever posted each job that hours are ready to approve, one
 * message per person for everything new. Each timesheet is claimed first,
 * so two runs at once never send the same one twice.
 */
export async function notifyTimesheetsReady(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("timesheets")
    .update({ business_notified_at: new Date().toISOString() })
    .eq("status", "submitted")
    .is("business_notified_at", null)
    .select("id");
  if (error) throw new Error(`Couldn't claim timesheets: ${error.message}`);
  const rows = await loadTimesheets((data ?? []).map((row) => row.id));
  if (rows.length === 0) return 0;
  for (const [postedBy, sheets] of byPoster(rows)) {
    const first = sheets[0]!;
    const by = sheets
      .map((sheet) => sheet.approve_by)
      .sort()
      .at(0)!;
    await notify(
      "timesheets_ready",
      postedBy,
      {
        summary:
          sheets.length === 1
            ? `${first.name} at ${first.site}`
            : `${sheets.length} timesheets`,
        hours: sheets.map(line).join("\n"),
        deadline: formatDateTime(by),
      },
      { url: "/business/timesheets" },
    );
  }
  return rows.length;
}

/** Tells whoever posted each job about hours approved automatically. */
export async function notifyAutoApproved(ids: readonly string[]) {
  const rows = await loadTimesheets(ids);
  if (rows.length === 0) return;
  const settings = await getAllSettings();
  for (const [postedBy, sheets] of byPoster(rows)) {
    await notify(
      "timesheets_auto_approved",
      postedBy,
      {
        summary:
          sheets.length === 1
            ? `${sheets[0]!.name}'s hours`
            : `${sheets.length} timesheets`,
        window: String(settings.auto_approve_hours),
        hours: sheets.map(line).join("\n"),
      },
      { url: "/business/timesheets" },
    );
  }
}

/** Tells the worker the business changed or entered their hours. */
export async function notifyHoursChanged(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.profileId) return;
  await notify(
    "hours_changed",
    row.profileId,
    {
      business: row.business,
      day: row.day,
      site: row.site,
      hours: hoursLabel(row),
      note: row.business_note ? `"${row.business_note}"` : "",
    },
    { url: `/worker/timesheets/${row.id}` },
  );
}

/** Tells the worker the business queried their hours. */
export async function notifyHoursQueried(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.profileId) return;
  await notify(
    "hours_queried",
    row.profileId,
    { business: row.business, day: row.day, site: row.site },
    { url: `/worker/timesheets/${row.id}` },
  );
}

/** Tells whoever posted the job the worker queried approved hours. */
export async function notifyWorkerQueried(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.postedBy) return;
  await notify(
    "worker_queried_hours",
    row.postedBy,
    {
      worker: row.name,
      day: row.day,
      site: row.site,
      hours: hoursLabel(row),
      note: row.worker_note ?? "",
    },
    { url: `/business/timesheets/${row.id}` },
  );
}

/** Tells both sides how our team settled a query. */
export async function notifyResolved(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row) return;
  const outcome =
    row.status === "rejected"
      ? "the hours won't be paid or charged"
      : `the hours are ${hoursLabel(row)}`;
  if (row.profileId) {
    await notify(
      "query_settled_worker",
      row.profileId,
      {
        day: row.day,
        site: row.site,
        outcome,
        resolution: row.resolution ?? "",
      },
      { url: `/worker/timesheets/${row.id}` },
    );
  }
  if (row.postedBy) {
    await notify(
      "query_settled_business",
      row.postedBy,
      {
        worker: row.name,
        day: row.day,
        site: row.site,
        outcome,
        resolution: row.resolution ?? "",
      },
      { url: `/business/timesheets/${row.id}` },
    );
  }
}
