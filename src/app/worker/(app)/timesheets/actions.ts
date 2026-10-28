"use server";

import { revalidatePath } from "next/cache";

import { SITE_TAGS } from "@/domain/ratings";
import { failure, success, type ActionState } from "@/lib/forms";
import { ratingFromForm } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { saveFailed } from "@/server/errors";
import { notifyWorkerQueried } from "@/server/timesheet-notices";
import { getMyWorker } from "@/server/workers";

function readNote(
  formData: FormData,
  missing: string,
): { note: string } | { state: ActionState } {
  const note = String(formData.get("note") ?? "").trim();
  return note
    ? { note }
    : {
        state: failure("Check the highlighted fields.", { note: [missing] }),
      };
}

function refresh(id: string) {
  revalidatePath("/worker/timesheets");
  revalidatePath(`/worker/timesheets/${id}`);
}

/**
 * The worker's note on their hours: for the business while it's deciding,
 * or their side of a query.
 */
export async function noteTimesheet(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getMyWorker();
  const read = readNote(formData, "Write your note");
  if ("state" in read) return read.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_timesheet", {
    p_id: id,
    p_note: read.note,
  });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  refresh(id);
  return success("Note saved");
}

/** Queries approved hours with our team (brief §4.6). */
export async function disputeTimesheet(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getMyWorker();
  const read = readNote(formData, "Say what's wrong with the hours");
  if ("state" in read) return read.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispute_timesheet", {
    p_id: id,
    p_note: read.note,
  });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  await notifyWorkerQueried(id);
  refresh(id);
  return success("Sent to our team. We'll look into it and let you know.");
}

/** The worker rates the site once their hours are approved (brief §4.7). */
export async function rateSite(
  assignmentId: string,
  timesheetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getMyWorker();
  const parsed = ratingFromForm(formData, SITE_TAGS);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_site", {
    p_assignment_id: assignmentId,
    p_score: parsed.score,
    p_tags: parsed.tags,
    p_note: parsed.note || undefined,
  });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  refresh(timesheetId);
  return success("Thanks for rating the site.");
}
