import { redirect } from "next/navigation";

import { resumeBusinessStep } from "@/domain/business-onboarding";
import { getMyBusiness } from "@/server/businesses";

/** Picks up business setup where the owner left off. */
export default async function BusinessOnboardingPage() {
  const { business } = await getMyBusiness();
  if (!business) redirect("/business/onboarding/abn");
  if (business.status !== "draft") redirect("/business");
  redirect(
    `/business/onboarding/${resumeBusinessStep(business.onboarding_steps)}`,
  );
}
