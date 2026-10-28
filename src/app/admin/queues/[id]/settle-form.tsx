"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Textarea } from "@/components/ui/textarea";
import type { OutcomeChoice } from "@/lib/admin-flags";
import type { ActionState } from "@/lib/forms";

/** What an admin decided about a matter, and a note saying why. */
export function SettleForm({
  action,
  choices,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  choices: OutcomeChoice[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(action);
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <ActionFeedback state={state} />
      {choices.length > 1 ? (
        <ChoiceField
          id="outcome"
          name="outcome"
          legend="What happens now"
          error={fieldErrors?.outcome}
          choices={choices}
          columns={1}
        />
      ) : null}
      <FormField
        id="note"
        label="What was decided, and why"
        hint="Kept with the matter for other admins. If you take the worker off a shift, we send it to them."
        error={fieldErrors?.note}
      >
        {(props) => (
          <Textarea {...props} name="note" rows={3} maxLength={500} required />
        )}
      </FormField>
      <SubmitButton pending={pending} pendingText="Settling…">
        Settle it
      </SubmitButton>
    </form>
  );
}
