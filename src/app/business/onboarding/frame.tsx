import { redirect } from "next/navigation";

import { WizardShell } from "@/components/wizard/wizard-shell";
import {
  BUSINESS_STEPS,
  type BusinessStepKey,
} from "@/domain/business-onboarding";
import { getMyBusiness } from "@/server/businesses";

/** Where each step's details live once the business has been submitted. */
const AFTER_SUBMIT: Record<BusinessStepKey, string> = {
  abn: "/business/settings",
  details: "/business/settings",
  sites: "/business/sites",
  team: "/business/team",
  agreement: "/business/settings",
  submit: "/business",
};

/**
 * Loads the business for a wizard step. Only the owner sets up the
 * business, and only while it's a draft.
 */
export async function loadBusinessStep(step: BusinessStepKey) {
  const mine = await getMyBusiness();
  if (mine.business && mine.business.status !== "draft") {
    redirect(AFTER_SUBMIT[step]);
  }
  if (mine.business && mine.role !== "owner") redirect("/business");
  if (!mine.business && step !== "abn") redirect("/business/onboarding/abn");
  return mine;
}

export function BusinessStepFrame({
  step,
  completed,
  title,
  description,
  children,
}: {
  step: BusinessStepKey;
  completed: readonly string[];
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <WizardShell
      steps={BUSINESS_STEPS}
      currentKey={step}
      completedKeys={completed}
      title={title}
      description={description}
      exitHref="/business"
      stepHref={(key) => `/business/onboarding/${key}`}
    >
      {children}
    </WizardShell>
  );
}
