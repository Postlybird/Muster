import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { checkAttendance } from "@/server/attendance";
import { finishShifts } from "@/server/reliability";
import { sendReminders } from "@/server/reminders";
import { runTimesheets } from "@/server/timesheets";

/**
 * Scheduled jobs, run by a scheduler that sends the CRON_SECRET (plan:
 * Supabase pg_cron for frequent jobs, once the site has an address).
 */
const JOBS: Record<string, () => Promise<unknown>> = {
  reminders: () => sendReminders(),
  "finish-shifts": () => finishShifts(),
  attendance: () => checkAttendance(),
  timesheets: () => runTimesheets(),
};

function allowed(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function run(
  request: Request,
  { params }: RouteContext<"/api/cron/[job]">,
) {
  if (!allowed(request)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const { job } = await params;
  const task = JOBS[job];
  if (!task) {
    return NextResponse.json({ error: "No such job" }, { status: 404 });
  }
  return NextResponse.json({ job, result: await task() });
}

export const GET = run;
export const POST = run;
