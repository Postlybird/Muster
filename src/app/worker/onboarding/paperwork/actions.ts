"use server";

import { failure, type ActionState } from "@/lib/forms";
import { recordAcceptances } from "@/server/agreements";
import {
  finishStep,
  getMyWorker,
  unacceptedEmploymentDocuments,
} from "@/server/workers";

export async function acceptPaperwork(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, worker } = await getMyWorker();
  const outstanding = await unacceptedEmploymentDocuments(user.id);
  const ticked = new Set(formData.getAll("agreement_ids").map(String));

  const errors: Record<string, string[]> = {};
  for (const document of outstanding) {
    if (!ticked.has(document.id)) {
      errors[`agreement_${document.id}`] = ["Tick the box to confirm"];
    }
  }
  if (Object.keys(errors).length > 0) {
    return failure("Confirm each document to carry on.", errors);
  }

  const problem = await recordAcceptances(
    user.id,
    outstanding.map((document) => document.id),
  );
  if (problem) return failure(problem);
  return finishStep(worker, "paperwork");
}
