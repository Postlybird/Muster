"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";
import { WizardActions } from "@/components/wizard/wizard-actions";

import { submitBusiness } from "../actions";

export function SubmitBusinessForm({ ready }: { ready: boolean }) {
  const { state, onSubmit, pending } = useServerForm(submitBusiness);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ActionFeedback state={state} />
      <WizardActions
        pending={pending}
        disabled={!ready}
        primaryLabel="Submit for approval"
        backHref="/business/onboarding/agreement"
      />
    </form>
  );
}
