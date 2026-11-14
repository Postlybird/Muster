"use server";

import { FAIR_WORK_STATEMENTS } from "@/config/fair-work";
import { failure, type ActionState } from "@/lib/forms";
import { recordAcceptances } from "@/server/agreements";
import { emailTemplate } from "@/server/notifications";
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
  // Their own copy of the Fair Work statements, by email (owner,
  // 14/11/2026). A failed email doesn't hold up the step.
  const statements = outstanding.some(
    (document) =>
      document.kind === "fair_work_information_statement" ||
      document.kind === "casual_employment_information_statement",
  );
  if (statements && user.email) {
    await emailTemplate("fair_work_statements", user.email, {
      fwis_link: FAIR_WORK_STATEMENTS.fwis,
      ceis_link: FAIR_WORK_STATEMENTS.ceis,
    }).catch((error: unknown) =>
      console.error("Couldn't email the Fair Work statements", error),
    );
  }
  return finishStep(worker, "paperwork");
}
