"use client";

import { SubmitButton } from "@/components/forms/submit-button";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { previousStep, type OnboardingStepKey } from "@/domain/onboarding";

/** "Save and continue" inside the wizard; "Save changes" when editing later. */
export function StepActions({
  mode,
  step,
  pending,
  disabled,
  primaryLabel,
  secondary,
  backHref,
}: {
  mode: "wizard" | "edit";
  step: OnboardingStepKey;
  pending: boolean;
  disabled?: boolean;
  primaryLabel?: string;
  secondary?: React.ReactNode;
  /** Instead of the previous step (e.g. back to the ticket list). */
  backHref?: string;
}) {
  if (mode === "wizard") {
    const back = previousStep(step);
    return (
      <WizardActions
        pending={pending}
        disabled={disabled}
        primaryLabel={primaryLabel}
        backHref={backHref ?? (back ? `/worker/onboarding/${back}` : null)}
        secondary={secondary}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SubmitButton pending={pending} disabled={disabled} size="lg">
        {primaryLabel ?? "Save changes"}
      </SubmitButton>
      {secondary}
    </div>
  );
}
