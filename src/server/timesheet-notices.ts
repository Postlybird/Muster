import "server-only";

import { formatDateTime, formatDayShort } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoursLabel, workerName } from "@/lib/timesheet-format";

import { emailPerson, textPerson } from "./notify";
import { requestOrigin } from "./request";
import { getAllSettings } from "./settings";

/**
 * Messages about timesheets (brief §4.6). Until notifications arrive in
 * step 1.14, workers are texted and whoever posted the job is emailed, as
 * in booking-notices.ts; these look up who to tell with the service-role
 * key.
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
 * Tells whoever posted each job that hours are ready to approve, one email
 * per person for everything new. Each timesheet is claimed first, so two
 * runs at once never send the same one twice.
 */
export async function emailTimesheetsReady(): Promise<number> {
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
  const origin = await requestOrigin();
  for (const [postedBy, sheets] of byPoster(rows)) {
    const first = sheets[0]!;
    const by = sheets
      .map((sheet) => sheet.approve_by)
      .sort()
      .at(0)!;
    await emailPerson(postedBy, {
      subject:
        sheets.length === 1
          ? `Hours to approve: ${first.name} at ${first.site}`
          : `${sheets.length} timesheets to approve`,
      text: `These hours are ready for you to approve:\n\n${sheets.map(line).join("\n")}\n\nApprove or change them by ${formatDateTime(by)}, or they'll be approved as they are. If something's wrong, query them and our team will look into it: ${origin}/business/timesheets`,
      tag: "timesheets-ready",
    });
  }
  return rows.length;
}

/** Tells whoever posted each job about hours approved automatically. */
export async function emailAutoApproved(ids: readonly string[]) {
  const rows = await loadTimesheets(ids);
  if (rows.length === 0) return;
  const [origin, settings] = await Promise.all([
    requestOrigin(),
    getAllSettings(),
  ]);
  for (const [postedBy, sheets] of byPoster(rows)) {
    await emailPerson(postedBy, {
      subject:
        sheets.length === 1
          ? `Approved automatically: ${sheets[0]!.name}'s hours`
          : `${sheets.length} timesheets approved automatically`,
      text: `Nobody approved or queried these hours within ${settings.auto_approve_hours} hours, so they've been approved as they were:\n\n${sheets.map(line).join("\n")}\n\nThey'll be on your next invoice. If something's wrong, contact us. See your timesheets: ${origin}/business/timesheets`,
      tag: "timesheets-auto-approved",
    });
  }
}

/** Tells the worker the business changed or entered their hours. */
export async function textHoursChanged(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.profileId) return;
  const origin = await requestOrigin();
  const note = row.business_note ? ` "${row.business_note}"` : "";
  await textPerson(
    row.profileId,
    `${row.business} set your hours for ${row.day} at ${row.site} to ${hoursLabel(row)}.${note} If that's not right, query them: ${origin}/worker/timesheets/${row.id}`,
  );
}

/** Tells the worker the business queried their hours. */
export async function textHoursQueried(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.profileId) return;
  const origin = await requestOrigin();
  await textPerson(
    row.profileId,
    `${row.business} has queried your hours for ${row.day} at ${row.site}. Our team will look into it. Add your side: ${origin}/worker/timesheets/${row.id}`,
  );
}

/** Tells whoever posted the job the worker queried approved hours. */
export async function emailWorkerQueried(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row?.postedBy) return;
  const origin = await requestOrigin();
  await emailPerson(row.postedBy, {
    subject: `${row.name} has queried their hours at ${row.site}`,
    text: `${row.name} has queried the hours approved for ${row.day} at ${row.site} (${hoursLabel(row)}):\n\n"${row.worker_note ?? ""}"\n\nOur team will look into it and let you both know. Add your side: ${origin}/business/timesheets/${row.id}`,
    tag: "timesheet-queried",
  });
}

/** Tells both sides how our team settled a query. */
export async function noticeResolved(timesheetId: string) {
  const [row] = await loadTimesheets([timesheetId]);
  if (!row) return;
  const origin = await requestOrigin();
  const outcome =
    row.status === "rejected"
      ? "the hours won't be paid or charged"
      : `the hours are ${hoursLabel(row)}`;
  if (row.profileId) {
    await textPerson(
      row.profileId,
      `We've settled the query about your hours for ${row.day} at ${row.site}: ${outcome}. ${row.resolution ?? ""} ${origin}/worker/timesheets/${row.id}`.trim(),
    );
  }
  if (row.postedBy) {
    await emailPerson(row.postedBy, {
      subject: `Query settled: ${row.name}'s hours at ${row.site}`,
      text: `We've settled the query about ${row.name}'s hours for ${row.day} at ${row.site}: ${outcome}.\n\n${row.resolution ?? ""}\n\nSee the timesheet: ${origin}/business/timesheets/${row.id}`,
      tag: "timesheet-resolved",
    });
  }
}
