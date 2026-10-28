"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pickOutcome } from "@/domain/bookings";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { textBooked } from "@/server/booking-notices";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { refreshWorkerMatches } from "@/server/matching";

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
