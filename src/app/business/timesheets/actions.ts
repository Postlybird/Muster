"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { WORKER_TAGS } from "@/domain/ratings";
import { failure, success, type ActionState } from "@/lib/forms";
import { ratingFromForm } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { hoursFromForm, type ShiftDay } from "@/lib/timesheets";
import { blockWorker, setFavourite } from "@/server/business-workers";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { refreshReliability } from "@/server/reliability";
import {
  notifyHoursChanged,
  notifyHoursQueried,
} from "@/server/timesheet-notices";
import { costTimesheets } from "@/server/timesheets";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function refresh(timesheetId?: string) {
  revalidatePath("/business/timesheets");
  if (timesheetId) revalidatePath(`/business/timesheets/${timesheetId}`);
  revalidatePath("/business", "layout");
}

/** The database's message for a broken rule, or the generic one. */
function refused(error: { code: string; message: string }): ActionState {
  return error.code === "23514"
    ? failure(`${error.message}.`)
    : saveFailed(error);
}

async function signedIn() {
  const { business } = await getMyBusiness();
  return business !== null;
}

async function approve(ids: string[]): Promise<ActionState> {
  if (!(await signedIn())) return failure("Sign in to your business first.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_timesheets", {
    p_ids: ids,
  });
  if (error) return saveFailed(error);
  const approved = (data ?? []).map((row) => row.timesheet_id);
  if (approved.length === 0) {
    return failure("Those hours have already been dealt with.");
  }
  await costTimesheets(approved);
  refresh(ids.length === 1 ? ids[0] : undefined);
  return success(
    approved.length === 1
      ? "Hours approved"
      : `${approved.length} timesheets approved`,
  );
}

/** Approves the ticked timesheets (brief §7: bulk approve). */
export async function approveTimesheets(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ids = formData
    .getAll("timesheet")
    .map(String)
    .filter((id) => UUID.test(id));
  if (ids.length === 0) return failure("Tick the hours to approve.");
  return approve(ids);
}

/** Approves one timesheet as it is. */
export async function approveTimesheet(id: string): Promise<ActionState> {
  if (!UUID.test(id)) return failure("That timesheet isn't available.");
  return approve([id]);
}

/** Who a timesheet is for, read as the business (so RLS applies). */
async function workerOf(timesheetId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select("worker_id")
    .eq("id", timesheetId)
    .maybeSingle();
  return data?.worker_id ?? null;
}

/**
 * Changes the hours and approves them, with a note for the worker (brief
 * §4.6: supervisors adjust times and record breaks).
 */
export async function adjustTimesheet(
  id: string,
  day: ShiftDay,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await signedIn())) return failure("Sign in to your business first.");
  const parsed = hoursFromForm(formData, day, { noteRequired: true });
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_timesheet", {
    p_id: id,
    p_start: parsed.hours.start.toISOString(),
    p_finish: parsed.hours.finish.toISOString(),
    p_break_minutes: parsed.hours.breakMinutes,
    p_note: parsed.note,
  });
  if (error) return refused(error);
  await costTimesheets([id]);
  const workerId = await workerOf(id);
  if (workerId) await refreshReliability([workerId]);
  await notifyHoursChanged(id);
  refresh(id);
  return success("Hours changed and approved. We've told the worker.");
}

/**
 * Enters hours for a booking with no timesheet, usually because they
 * didn't clock in. They're approved as entered; the worker is told.
 */
export async function addTimesheet(
  assignmentId: string,
  day: ShiftDay,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await signedIn())) return failure("Sign in to your business first.");
  const parsed = hoursFromForm(formData, day, { noteRequired: false });
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("add_timesheet", {
    p_assignment_id: assignmentId,
    p_start: parsed.hours.start.toISOString(),
    p_finish: parsed.hours.finish.toISOString(),
    p_break_minutes: parsed.hours.breakMinutes,
    p_note: parsed.note || undefined,
  });
  if (error) return refused(error);
  await costTimesheets([id]);
  const workerId = await workerOf(id);
  if (workerId) await refreshReliability([workerId]);
  await notifyHoursChanged(id);
  refresh(id);
  redirect(`/business/timesheets/${id}`);
}

/** Sends hours to our team to look into (brief §4.6). */
export async function disputeTimesheet(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await signedIn())) return failure("Sign in to your business first.");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) {
    return failure("Check the highlighted fields.", {
      note: ["Say what's wrong with the hours"],
    });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispute_timesheet", {
    p_id: id,
    p_note: note,
  });
  if (error) return refused(error);
  await notifyHoursQueried(id);
  refresh(id);
  return success("Sent to our team. We'll look into it and let you both know.");
}

/** The business's side of a query. */
export async function noteTimesheet(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await signedIn())) return failure("Sign in to your business first.");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) {
    return failure("Check the highlighted fields.", {
      note: ["Write your side of it"],
    });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_timesheet", {
    p_id: id,
    p_note: note,
  });
  if (error) return refused(error);
  refresh(id);
  return success("Saved. Our team can see it.");
}

/**
 * The business rates the worker once their hours are approved (brief
 * §4.7). Owners and managers can also make them a favourite or block them.
 */
export async function rateWorker(
  assignmentId: string,
  workerId: string,
  timesheetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business) return failure("Sign in to your business first.");
  const parsed = ratingFromForm(formData, WORKER_TAGS);
  if (!parsed.ok) return parsed.state;
  const next = canManage(role) ? String(formData.get("next") ?? "") : "";
  const reason = String(formData.get("reason") ?? "").trim();
  if (next === "block" && !reason) {
    return failure("Say why you don't want them back. Only our team sees it.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_worker", {
    p_assignment_id: assignmentId,
    p_score: parsed.score,
    p_tags: parsed.tags,
    p_note: parsed.note || undefined,
  });
  if (error) return refused(error);
  if (next === "favourite" || next === "block") {
    const { error: listError } =
      next === "favourite"
        ? await setFavourite(business.id, workerId, true)
        : await blockWorker(business.id, workerId, reason.slice(0, 500));
    if (listError) return saveFailed(listError);
  }
  refresh(timesheetId);
  revalidatePath("/business/workers");
  return success(
    next === "favourite"
      ? "Thanks for rating them. They're now one of your favourites."
      : next === "block"
        ? "Thanks for rating them. We won't offer them your work again."
        : "Thanks for rating them.",
  );
}
