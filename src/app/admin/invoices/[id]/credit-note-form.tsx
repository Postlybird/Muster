"use client";

import { useEffect, useRef } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

/**
 * The amount to credit (GST included) and why, which goes on the credit
 * note. It stays on the page once the invoice is credited in full, so the
 * message about the last note is still shown.
 */
export function CreditNoteForm({
  action,
  leftLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** What's left to credit, like "$429.39", or null when there's nothing. */
  leftLabel: string | null;
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(action);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  if (leftLabel === null) {
    return (
      <div className="space-y-3">
        <ActionFeedback state={state} />
        <p className="text-sm text-muted-foreground">
          There&apos;s nothing left to credit.
        </p>
      </div>
    );
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <ActionFeedback state={state} />
      <FormField
        id="amount"
        label="Amount to credit, including GST"
        hint={`Up to ${leftLabel}.`}
        error={fieldErrors?.amount}
      >
        {(props) => (
          <Input
            {...props}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            className="max-w-48"
            required
          />
        )}
      </FormField>
      <FormField
        id="reason"
        label="Reason"
        hint="It's printed on the credit note the business gets."
        error={fieldErrors?.reason}
      >
        {(props) => (
          <Textarea
            {...props}
            name="reason"
            maxLength={500}
            rows={3}
            required
          />
        )}
      </FormField>
      <SubmitButton pending={pending} pendingText="Issuing…">
        Issue credit note
      </SubmitButton>
    </form>
  );
}
