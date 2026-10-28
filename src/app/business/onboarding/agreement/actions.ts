"use server";

import { revalidatePath } from "next/cache";

import { formBoolean, failure, success, type ActionState } from "@/lib/forms";
import { currentAgreement, recordAcceptances } from "@/server/agreements";
import { finishBusinessStep, getMyBusiness } from "@/server/businesses";

/**
 * Accepts the current Labour Hire Services Agreement for the business:
 * during setup, or from Settings when we publish a new version.
 */
export async function acceptServicesAgreement(
  agreementId: string,
  context: "onboarding" | "page",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, business, role } = await getMyBusiness();
  if (!business || role !== "owner") {
    return failure("Only the owner can accept the agreement.");
  }
  if (!formBoolean(formData.get("accept"))) {
    return failure("Tick the box to accept the agreement.", {
      accept: ["Tick the box to accept the agreement"],
    });
  }
  const current = await currentAgreement("labour_hire_services");
  if (!current || current.id !== agreementId) {
    return failure(
      "The agreement has just been updated. Reload the page to read the new version.",
    );
  }
  const problem = await recordAcceptances(user.id, [current.id], business.id);
  if (problem) return failure(problem);
  if (context === "onboarding")
    return finishBusinessStep(business, "agreement");
  revalidatePath("/business", "layout");
  return success("Agreement accepted");
}
