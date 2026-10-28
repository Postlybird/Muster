"use server";

import { redirect } from "next/navigation";

import { resumeStep } from "@/domain/onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { currentAgreement, recordAcceptances } from "@/server/agreements";
import { getMyWorker } from "@/server/workers";

/** "Start": records that the worker read the collection notice, then opens the wizard. */
export async function startOnboarding(): Promise<ActionState> {
  const { user, worker } = await getMyWorker();
  const notice = await currentAgreement("privacy_collection_notice");
  if (notice) {
    const problem = await recordAcceptances(user.id, [notice.id]);
    if (problem) return failure(problem);
  }
  redirect(`/worker/onboarding/${resumeStep(worker.onboarding_steps)}`);
}
