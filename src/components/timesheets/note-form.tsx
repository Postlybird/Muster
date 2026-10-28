"use client";

import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

/** A note about some hours: a side of the story, or a query for our team. */
export function NoteForm({
  action,
  id,
  label,
  hint,
  defaultValue,
  submitLabel,
  pendingText = "Sending…",
  variant = "default",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  submitLabel: string;
  pendingText?: string;
  variant?: "default" | "outline";
}) {
  // The page usually changes once it's sent, so the toast comes from here.
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id={id} label={label} hint={hint} error={fieldErrors?.note}>
        {(props) => (
          <Textarea
            {...props}
            name="note"
            rows={3}
            maxLength={1000}
            defaultValue={defaultValue ?? ""}
            required
          />
        )}
      </FormField>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton
        pending={pending}
        pendingText={pendingText}
        variant={variant}
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
