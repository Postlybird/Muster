"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pickOutcome } from "@/domain/bookings";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  textBooked,
  textNoShow,
  textShiftsCancelled,
} from "@/server/booking-notices";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { refreshWorkerMatches } from "@/server/matching";
import { refreshReliability } from "@/server/reliability";

const name = z
  .string()
  .trim()
  .min(1, "Give the template a name")
  .max(80, "Keep the name under 80 characters");

/** Saves a posted job as a template, to post again quickly (brief §4.3). */
export async function saveTemplate(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers can save templates.");
  }
  const parsed = name.safeParse(formData.get("name") ?? "");
  if (!parsed.success) {
    return failure("Check the highlighted fields.", {
      name: [parsed.error.issues[0]?.message ?? "Check the name"],
    });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_templates")
    .insert({ business_id: business.id, job_id: jobId, name: parsed.data });
  if (error) {
    if (error.code === "23505") {
      return failure("Check the highlighted fields.", {
        name: ["You already have a template with that name"],
      });
    }
    return saveFailed(error);
  }
  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business/post");
  return success(`Saved as "${parsed.data}"`);
}

/**
 * Books an applicant on every shift of the job they applied for that still
 * has room (plan: picking confirms instantly). Their eligibility is checked
 * again first (brief §4.4).
 */
export async function pickApplicant(
  jobId: string,
  workerId: string,
  name: string,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers pick workers.");
  }
  await refreshWorkerMatches(workerId, { notify: false });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_applicant", {
    p_job_id: jobId,
    p_worker_id: workerId,
  });
  if (error) return saveFailed(error);
  const rows = data ?? [];
  const outcome = pickOutcome(
    name,
    rows.map((row) => row.result),
  );
  const booked = rows
    .filter((row) => row.result === "booked")
    .map((row) => row.shift_id);
  if (booked.length > 0) await textBooked(workerId, jobId, booked);
  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business");
  return outcome.ok ? success(outcome.message) : failure(outcome.message);
}

/**
 * Cancels some or all of a job's shifts (brief §4.5). Booked workers are
 * told; inside the late window each booking is charged per the settings.
 */
export async function cancelShifts(
  jobId: string,
  shiftIds: string[],
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return failure("Only owners and managers cancel work.");
  }
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return failure("Check the highlighted fields.", {
      reason: ["Say why, so we can tell the workers"],
    });
  }
  if (reason.length > 500) {
    return failure("Check the highlighted fields.", {
      reason: ["Keep it under 500 characters"],
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_shifts", {
    p_shift_ids: shiftIds,
    p_reason: reason,
  });
  if (error) return saveFailed(error);
  const released = data ?? [];
  await textShiftsCancelled(jobId, released);
  await refreshReliability(released.map((row) => row.worker_id));
  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business", "layout");
  const late = released.filter((row) => row.late).length;
  return success(
    late > 0
      ? `Cancelled. We've told the workers. As it's close to the start, ${late === 1 ? "1 booking is" : `${late} bookings are`} charged.`
      : released.length > 0
        ? "Cancelled. We've told the workers."
        : "Cancelled.",
  );
}

/** Reports that a booked worker didn't turn up (brief §4.5). */
export async function reportNoShow(
  jobId: string,
  assignmentId: string,
  workerId: string,
): Promise<ActionState> {
  const { business } = await getMyBusiness();
  if (!business) return failure("Sign in to your business first.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("report_no_show", { p_assignment_id: assignmentId })
    .maybeSingle();
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  await refreshReliability([workerId]);
  await textNoShow(workerId, jobId, !!data?.suspended);
  if (data?.suspended) await refreshWorkerMatches(workerId, { notify: false });
  revalidatePath(`/business/jobs/${jobId}`);
  revalidatePath("/business/timesheets");
  return success("Recorded. Thanks for letting us know.");
}

/** Confirms a booked worker has arrived, e.g. when their phone couldn't clock in. */
export async function confirmArrival(
  jobId: string,
  assignmentId: string,
): Promise<ActionState> {
  const { business } = await getMyBusiness();
  if (!business) return failure("Sign in to your business first.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_arrival", {
    p_assignment_id: assignmentId,
  });
  if (error) {
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  revalidatePath(`/business/jobs/${jobId}`);
  return success("Arrival confirmed");
}
