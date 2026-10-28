"use server";

import { revalidatePath } from "next/cache";

import { takeOutcome } from "@/domain/bookings";
import type { FillMode } from "@/domain/jobs";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { emailFirstApplicant, emailIfFilled } from "@/server/booking-notices";
import { saveFailed } from "@/server/errors";
import { refreshWorkerMatches } from "@/server/matching";
import { getMyWorker } from "@/server/workers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function refresh(jobId: string) {
  revalidatePath(`/worker/shifts/${jobId}`);
  revalidatePath("/worker", "layout");
}

/**
 * Applies for ("I'll choose") or accepts ("First in") the chosen shifts of
 * a job (brief §4.4). Eligibility is checked again first.
 */
export async function takeShifts(
  jobId: string,
  // Each database function only books jobs filled its way, so the mode
  // the page showed is safe to trust.
  mode: FillMode,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { worker } = await getMyWorker();
  if (worker.status !== "active") {
    return failure("You can take shifts once your details are verified.");
  }
  const shiftIds = formData
    .getAll("shift")
    .map(String)
    .filter((id) => UUID.test(id));
  if (shiftIds.length === 0) {
    return failure("Choose at least one shift.", {
      shift: ["Choose at least one shift"],
    });
  }
  const supabase = await createClient();
  await refreshWorkerMatches(worker.id, { notify: false });
  const { data, error } =
    mode === "auto"
      ? await supabase.rpc("accept_shifts", { p_shift_ids: shiftIds })
      : await supabase.rpc("apply_for_shifts", { p_shift_ids: shiftIds });
  if (error) return saveFailed(error);
  const results = (data ?? []).map((row) => row.result);
  const outcome = takeOutcome(mode, results);
  // On failure the page stays as it is, so they can read why.
  if (!outcome.ok) return failure(outcome.message);
  refresh(jobId);
  if (mode === "auto") await emailIfFilled(jobId);
  else await emailFirstApplicant(jobId);
  return success(outcome.message);
}

/** Withdraws the worker's applications for a job, before anyone picks. */
export async function withdrawApplications(
  jobId: string,
): Promise<ActionState> {
  await getMyWorker();
  const supabase = await createClient();
  const { data: shifts } = await supabase.rpc("my_shifts", { p_job_id: jobId });
  const applied = (shifts ?? [])
    .filter((shift) => shift.application_status === "applied")
    .map((shift) => shift.shift_id);
  if (applied.length === 0) return failure("There's nothing to withdraw.");
  const { error } = await supabase.rpc("withdraw_applications", {
    p_shift_ids: applied,
  });
  if (error) return saveFailed(error);
  refresh(jobId);
  return success("Application withdrawn");
}
