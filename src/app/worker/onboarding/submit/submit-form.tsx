"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { useServerForm } from "@/components/forms/use-server-form";

import { StepActions } from "../step-actions";
import { submitOnboarding } from "./actions";

export function SubmitForm({ ready }: { ready: boolean }) {
  const { state, onSubmit, pending } = useServerForm(submitOnboarding);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ActionFeedback state={state} />
      <StepActions
        mode="wizard"
        step="submit"
        pending={pending}
        disabled={!ready}
        primaryLabel="Submit for checking"
      />
    </form>
  );
}
