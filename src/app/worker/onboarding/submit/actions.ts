"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { stepTitle } from "@/domain/onboarding";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  getMyWorker,
  missingOnboardingSteps,
  saveFailed,
} from "@/server/workers";

export async function submitOnboarding(): Promise<ActionState> {
  const { user, worker } = await getMyWorker();
  if (worker.status !== "draft") redirect("/worker");

  const missing = await missingOnboardingSteps(user, worker);
  if (missing.length > 0) {
    return failure(`Finish these first: ${missing.map(stepTitle).join(", ")}.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_worker_onboarding");
  if (error) {
    // The database's own last check explains itself (age, missing steps).
    if (error.code === "23514") return failure(`${error.message}.`);
    return saveFailed(error);
  }
  revalidatePath("/worker", "layout");
  redirect("/worker?submitted=1");
}
