"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/forms";

/** When the money arrived, and the bank's reference for it. */
export function MarkPaidForm({
  action,
  today,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** yyyy-mm-dd in Sydney. */
  today: string;
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(action);
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ActionFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="paid_on" label="Paid on" error={fieldErrors?.paid_on}>
          {(props) => (
            <Input
              {...props}
              name="paid_on"
              type="date"
              defaultValue={today}
              max={today}
              required
            />
          )}
        </FormField>
        <FormField
          id="reference"
          label="Payment reference (optional)"
          hint="As it shows on our bank statement."
          error={fieldErrors?.reference}
        >
          {(props) => <Input {...props} name="reference" maxLength={200} />}
        </FormField>
      </div>
      <SubmitButton pending={pending} pendingText="Saving…">
        Mark paid
      </SubmitButton>
    </form>
  );
}
