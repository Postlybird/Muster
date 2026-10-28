"use server";

import { z } from "zod";

import { safetyProblem } from "@/domain/jobs";
import { failure, formBoolean, type ActionState } from "@/lib/forms";
import { saveFailed } from "@/server/errors";
import { draftForAction, finishPostStep } from "@/server/jobs";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max.toLocaleString("en-AU")} characters`);

const schema = z.object({
  hazard_notes: text(2000),
  hazard_controls: text(2000),
  induction: text(2000),
  ppe_supplied_by: z.enum(["business", "worker", "both"], {
    error: "Choose who supplies the PPE",
  }),
  ppe_notes: text(1000),
});

/** Site hazards, controls, induction and PPE: required before posting (brief §4.3). */
export async function saveSafety(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const draft = await draftForAction(jobId);
  if (!draft) return failure("This job can't be changed any more.");
  const { job, supabase } = draft;

  const parsed = schema.safeParse({
    hazard_notes: formData.get("hazard_notes") ?? "",
    hazard_controls: formData.get("hazard_controls") ?? "",
    induction: formData.get("induction") ?? "",
    ppe_supplied_by: formData.get("ppe_supplied_by") ?? undefined,
    ppe_notes: formData.get("ppe_notes") ?? "",
  });
  const errors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;

  const ids = (name: string) =>
    formData
      .getAll(name)
      .map(String)
      .filter((id) => z.uuid().safeParse(id).success);
  const noKnownHazards = formBoolean(formData.get("no_known_hazards"));
  const hazardIds = noKnownHazards ? [] : ids("hazard_ids");
  const ppeIds = ids("ppe_ids");
  const [{ data: hazards }, { data: ppe }] = await Promise.all([
    supabase
      .from("hazards")
      .select("id")
      .in("id", hazardIds)
      .is("archived_at", null),
    supabase
      .from("ppe_items")
      .select("id")
      .in("id", ppeIds)
      .is("archived_at", null),
  ]);
  if ((hazards ?? []).length !== hazardIds.length) {
    errors.hazard_ids = ["Choose hazards from the list"];
  }
  if ((ppe ?? []).length !== ppeIds.length) {
    errors.ppe_ids = ["Choose PPE from the list"];
  }

  const problem = safetyProblem({
    hazardCount: hazardIds.length,
    noKnownHazards,
    controls: parsed.success ? parsed.data.hazard_controls : "",
  });
  if (problem) {
    if (problem.includes("controls")) errors.hazard_controls = [problem];
    else errors.hazard_ids = [problem];
  }
  if (!parsed.success || Object.values(errors).some(Boolean)) {
    return failure("Check the highlighted fields.", errors);
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      no_known_hazards: noKnownHazards,
      hazard_notes: noKnownHazards ? "" : parsed.data.hazard_notes,
      hazard_controls: noKnownHazards ? "" : parsed.data.hazard_controls,
      induction: parsed.data.induction,
      ppe_supplied_by: parsed.data.ppe_supplied_by,
      ppe_notes: parsed.data.ppe_notes,
    })
    .eq("id", job.id);
  if (error) return saveFailed(error);

  const cleared = await Promise.all([
    supabase.from("job_hazards").delete().eq("job_id", job.id),
    supabase.from("job_ppe").delete().eq("job_id", job.id),
  ]);
  const clearError = cleared.find((result) => result.error)?.error;
  if (clearError) return saveFailed(clearError);
  const inserted = await Promise.all([
    hazardIds.length
      ? supabase
          .from("job_hazards")
          .insert(hazardIds.map((id) => ({ job_id: job.id, hazard_id: id })))
      : null,
    ppeIds.length
      ? supabase
          .from("job_ppe")
          .insert(ppeIds.map((id) => ({ job_id: job.id, ppe_item_id: id })))
      : null,
  ]);
  const insertError = inserted.find((result) => result?.error)?.error;
  if (insertError) return saveFailed(insertError);
  return finishPostStep(job, "safety");
}
