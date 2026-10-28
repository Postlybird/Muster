"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { hoursFromForm } from "@/lib/timesheets";
import { saveFailed } from "@/server/errors";
import { refreshReliability } from "@/server/reliability";
import { notifyResolved } from "@/server/timesheet-notices";
import { costTimesheets } from "@/server/timesheets";

/**
 * Settles a query (brief §4.6): the hours to pay and bill, or none. Both
 * sides are told.
 */
export async function resolveTimesheet(
  id: string,
  /** The shift's day in Sydney, yyyy-mm-dd. */
  date: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const worked = formData.get("outcome") !== "not_worked";
  const resolution = String(formData.get("note") ?? "").trim();
  if (!resolution) {
    return failure("Check the highlighted fields.", {
      note: ["Say what was decided, for both sides"],
    });
  }
  let hours = null;
  if (worked) {
    const parsed = hoursFromForm(formData, date, { noteRequired: false });
    if (!parsed.ok) return parsed.state;
    hours = parsed.hours;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_timesheet", {
    p_id: id,
    p_worked: worked,
    p_resolution: resolution,
    p_start: hours?.start.toISOString(),
    p_finish: hours?.finish.toISOString(),
    p_break_minutes: hours?.breakMinutes,
  });
  if (error) {
    return error.code === "23514"
      ? failure(`${error.message}.`)
      : saveFailed(error);
  }
  if (worked) await costTimesheets([id]);
  const { data: sheet } = await supabase
    .from("timesheets")
    .select("worker_id")
    .eq("id", id)
    .maybeSingle();
  if (sheet) await refreshReliability([sheet.worker_id]);
  await notifyResolved(id);
  revalidatePath("/admin/queues");
  revalidatePath(`/admin/timesheets/${id}`);
  redirect("/admin/queues?resolved=1");
}
