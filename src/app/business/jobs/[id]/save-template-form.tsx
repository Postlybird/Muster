"use client";

import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/forms";

import { saveTemplate } from "./actions";

export function SaveTemplateForm({ jobId }: { jobId: string }) {
  // Toast straight away: once saved, the page swaps this form for a note.
  const save = saveTemplate.bind(null, jobId);
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(async (prev: ActionState, formData: FormData) => {
    const result = await save(prev, formData);
    if (result.status === "success") toast.success(result.message);
    return result;
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <FormField
        id="template-name"
        label="Or save it as a template"
        hint="Templates appear on Post work, ready to use."
        error={errors?.name}
      >
        {(props) => <Input {...props} name="name" className="sm:w-80" />}
      </FormField>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        Save template
      </SubmitButton>
    </form>
  );
}
