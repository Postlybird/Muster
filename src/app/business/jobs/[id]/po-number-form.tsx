"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";

import { savePoNumber } from "./actions";

/** The job's PO or reference number, for its invoice lines (owner, 04/11/2026). */
export function PoNumberForm({
  jobId,
  poNumber,
}: {
  jobId: string;
  poNumber: string | null;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(savePoNumber.bind(null, jobId));
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <FormField
        id="po-number"
        label="PO or reference number"
        hint="Optional. It goes on this job's lines from the next weekly invoice."
        error={errors?.po_number}
      >
        {(props) => (
          <Input
            {...props}
            name="po_number"
            defaultValue={poNumber ?? ""}
            maxLength={50}
            className="sm:w-80"
          />
        )}
      </FormField>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        Save PO number
      </SubmitButton>
    </form>
  );
}
