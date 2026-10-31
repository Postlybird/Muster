import { redirect } from "next/navigation";

import { quickStartDone, resumeStep } from "@/domain/onboarding";

import { loadStep } from "./step-frame";

/** Picks up where the worker left off: the quick sign-up first. */
export default async function OnboardingPage() {
  const { worker, mode } = await loadStep();
  if (mode === "edit") redirect("/worker");
  if (!quickStartDone(worker.onboarding_steps)) {
    redirect("/worker/onboarding/start");
  }
  redirect(`/worker/onboarding/${resumeStep(worker.onboarding_steps)}`);
}
