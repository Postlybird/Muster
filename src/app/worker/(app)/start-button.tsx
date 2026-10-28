"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";

import { startOnboarding } from "./actions";

export function StartButton() {
  const { state, onSubmit, pending } = useServerForm(startOnboarding);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ActionFeedback state={state} />
      <SubmitButton
        pending={pending}
        pendingText="Starting…"
        size="lg"
        className="w-full sm:w-auto"
      >
        Start
      </SubmitButton>
    </form>
  );
}
