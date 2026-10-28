"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import type { OnboardingStepKey } from "@/domain/onboarding";

import { continueFrom } from "./actions";
import { StepActions } from "./step-actions";

/** The wizard's main button on a step with nothing to fill in. */
export function ContinueForm({
  step,
  label = "Continue",
  secondary,
}: {
  step: OnboardingStepKey;
  label?: string;
  secondary?: React.ReactNode;
}) {
  const { state, onSubmit, pending } = useServerForm(
    continueFrom.bind(null, step),
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ActionFeedback state={state} />
      <StepActions
        mode="wizard"
        step={step}
        pending={pending}
        primaryLabel={label}
        secondary={secondary}
      />
    </form>
  );
}
