"use server";

import type { OnboardingStepKey } from "@/domain/onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { finishStep, getMyWorker } from "@/server/workers";

/** Steps that can be passed without changing anything (already checked, or optional). */
const PASSABLE: OnboardingStepKey[] = ["right-to-work", "identity", "tickets"];

export async function continueFrom(
  step: OnboardingStepKey,
): Promise<ActionState> {
  if (!PASSABLE.includes(step)) return failure("Fill in this step first.");
  const { worker } = await getMyWorker();
  return finishStep(worker, step);
}
