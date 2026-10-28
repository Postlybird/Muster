"use server";

import { formBoolean, failure, type ActionState } from "@/lib/forms";
import { currentAgreement, recordAcceptances } from "@/server/agreements";
import { finishBusinessStep, getMyBusiness } from "@/server/businesses";

/** Accepts the current Labour Hire Services Agreement for the business. */
export async function acceptServicesAgreement(
  agreementId: string,
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
  return finishBusinessStep(business, "agreement");
}
