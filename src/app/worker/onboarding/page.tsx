import { redirect } from "next/navigation";

import { resumeStep } from "@/domain/onboarding";

import { loadStep } from "./step-frame";

/** Picks up where the worker left off. */
export default async function OnboardingPage() {
  const { worker, mode } = await loadStep();
  if (mode === "edit") redirect("/worker");
  redirect(`/worker/onboarding/${resumeStep(worker.onboarding_steps)}`);
}
