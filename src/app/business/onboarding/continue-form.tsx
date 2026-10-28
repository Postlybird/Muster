"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import { WizardActions } from "@/components/wizard/wizard-actions";
import {
  previousBusinessStep,
  type BusinessStepKey,
} from "@/domain/business-onboarding";

import { continueBusinessStep } from "./actions";

export function ContinueBusinessForm({
  step,
  label = "Continue",
}: {
  step: BusinessStepKey;
  label?: string;
}) {
  const { state, onSubmit, pending } = useServerForm(
    continueBusinessStep.bind(null, step),
  );
  const back = previousBusinessStep(step);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ActionFeedback state={state} />
      <WizardActions
        primaryLabel={label}
        pending={pending}
        backHref={back ? `/business/onboarding/${back}` : null}
      />
    </form>
  );
}
