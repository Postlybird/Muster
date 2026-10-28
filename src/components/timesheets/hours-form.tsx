"use client";

import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

/**
 * Start, finish and break for one shift (brief §4.6: supervisors adjust
 * times and record breaks), with a note. A finish earlier than the start
 * is the next morning.
 */
export function HoursForm({
  action,
  idPrefix,
  day,
  defaults,
  note,
  submitLabel,
  pendingText = "Saving…",
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  idPrefix: string;
  /** The shift's day, e.g. "Wed 4 Nov". */
  day: string;
  defaults: { start: string; finish: string; breakMinutes: number };
  note: { label: string; hint?: string; required: boolean };
  submitLabel: string;
  pendingText?: string;
  /** More fields, above the times. */
  children?: React.ReactNode;
}) {
  // The page usually moves on once it's saved, so the toast comes from here.
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {children}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Hours on {day}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            id={`${idPrefix}-start`}
            label="Started"
            error={fieldErrors?.start}
          >
            {(props) => (
              <Input
                {...props}
                type="time"
                name="start"
                defaultValue={defaults.start}
                required
              />
            )}
          </FormField>
          <FormField
            id={`${idPrefix}-finish`}
            label="Finished"
            hint="Before the start means the next morning."
            error={fieldErrors?.finish}
          >
            {(props) => (
              <Input
                {...props}
                type="time"
                name="finish"
                defaultValue={defaults.finish}
                required
              />
            )}
          </FormField>
          <FormField
            id={`${idPrefix}-break`}
            label="Unpaid break (minutes)"
            error={fieldErrors?.break}
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                name="break"
                min={0}
                max={240}
                step={1}
                defaultValue={defaults.breakMinutes}
              />
            )}
          </FormField>
        </div>
      </fieldset>
      <FormField
        id={`${idPrefix}-note`}
        label={note.required ? note.label : `${note.label} (optional)`}
        hint={note.hint}
        error={fieldErrors?.note}
      >
        {(props) => (
          <Textarea
            {...props}
            name="note"
            rows={3}
            maxLength={1000}
            required={note.required}
          />
        )}
      </FormField>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} pendingText={pendingText}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
