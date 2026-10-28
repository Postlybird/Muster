"use server";

import { z } from "zod";

import { MAX_JOB_PHOTOS } from "@/domain/jobs";
import { failure, formBoolean, type ActionState } from "@/lib/forms";
import { normaliseAuPhone } from "@/lib/phone";
import { acceptedUpload } from "@/lib/uploads";
import { saveFailed } from "@/server/errors";
import { draftForAction, finishPostStep } from "@/server/jobs";

const schema = z.object({
  instructions: z.string().trim().max(2000, "Keep it under 2,000 characters"),
  report_to_name: z.string().trim().max(80, "That's too long"),
  report_to_phone: z.string().trim(),
});

/** Tickets, police check, instructions, photos and who to report to (brief §4.3). */
export async function saveNeeds(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const draft = await draftForAction(jobId);
  if (!draft) return failure("This job can't be changed any more.");
  const { job, business, supabase } = draft;

  const parsed = schema.safeParse({
    instructions: formData.get("instructions") ?? "",
    report_to_name: formData.get("report_to_name") ?? "",
    report_to_phone: formData.get("report_to_phone") ?? "",
  });
  const errors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;
  let phone: string | null = null;
  if (parsed.success && parsed.data.report_to_phone) {
    phone = normaliseAuPhone(parsed.data.report_to_phone);
    if (!phone) errors.report_to_phone = ["Enter an Australian phone number"];
  }

  // Tickets: police checks have their own yes/no question.
  const wanted = formData.getAll("credential_ids").map(String);
  const { data: types } = await supabase
    .from("credential_types")
    .select("id")
    .in(
      "id",
      wanted.filter((id) => z.uuid().safeParse(id).success),
    )
    .eq("active", true)
    .neq("kind", "police_check")
    .is("archived_at", null);
  if ((types ?? []).length !== wanted.length) {
    errors.credential_ids = ["Choose tickets from the list"];
  }

  // Photos: keep, remove, or add (up to three).
  const { data: current } = await supabase
    .from("job_photos")
    .select("id, path")
    .eq("job_id", job.id)
    .is("archived_at", null);
  const removing = new Set(formData.getAll("remove_photo").map(String));
  const kept = (current ?? []).filter((photo) => !removing.has(photo.id));
  const added: string[] = [];
  for (const submitted of formData.getAll("photo")) {
    const path = acceptedUpload(submitted, null, business.id, "job");
    if (path === undefined)
      errors.photo = ["That photo didn't upload properly"];
    else if (path) added.push(path);
  }
  if (kept.length + added.length > MAX_JOB_PHOTOS) {
    errors.photo = [`Add up to ${MAX_JOB_PHOTOS} photos`];
  }

  if (!parsed.success || Object.values(errors).some(Boolean)) {
    return failure("Check the highlighted fields.", errors);
  }

  // Work types that need a police check always do (brief §4.1 step 7).
  const { data: category } = await supabase
    .from("categories")
    .select("police_check_required")
    .eq("id", job.category_id ?? "")
    .maybeSingle();
  const { error } = await supabase
    .from("jobs")
    .update({
      police_check_required:
        !!category?.police_check_required ||
        formBoolean(formData.get("police_check_required")),
      instructions: parsed.data.instructions,
      report_to_name: parsed.data.report_to_name || null,
      report_to_phone: phone,
    })
    .eq("id", job.id);
  if (error) return saveFailed(error);

  const { error: clearError } = await supabase
    .from("job_credentials")
    .delete()
    .eq("job_id", job.id);
  if (clearError) return saveFailed(clearError);
  if (wanted.length > 0) {
    const { error: ticketError } = await supabase
      .from("job_credentials")
      .insert(wanted.map((id) => ({ job_id: job.id, credential_type_id: id })));
    if (ticketError) return saveFailed(ticketError);
  }

  if (removing.size > 0) {
    const { error: removeError } = await supabase
      .from("job_photos")
      .update({ archived_at: new Date().toISOString() })
      .eq("job_id", job.id)
      .in("id", [...removing]);
    if (removeError) return saveFailed(removeError);
  }
  if (added.length > 0) {
    const { error: photoError } = await supabase.from("job_photos").insert(
      added.map((path, index) => ({
        job_id: job.id,
        path,
        sort_order: kept.length + index,
      })),
    );
    if (photoError) return saveFailed(photoError);
  }
  return finishPostStep(job, "needs");
}
