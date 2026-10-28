"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

/**
 * Approve or reject one check. Rejecting needs a message to the worker;
 * pick a ready-made reason and edit it if needed.
 */
export function DecisionForm({
  id,
  action,
  reasons,
  approveLabel = "Approve",
  renderApprove,
  submitLabel = "Save decision",
}: {
  id: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  reasons: string[];
  approveLabel?: string;
  /** Extra fields needed to approve (e.g. VEVO result). */
  renderApprove?: (
    errors: Record<string, string[] | undefined> | undefined,
  ) => React.ReactNode;
  submitLabel?: string;
}) {
  // Toast as soon as the save returns: a decided check's form disappears
  // from the page straight away, so it can't show the message itself.
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ChoiceField
        id={`${id}-decision`}
        name="decision"
        legend="Decision"
        value={decision}
        onValueChange={setDecision}
        error={fieldErrors?.decision}
        choices={[
          { value: "approve", label: approveLabel },
          { value: "reject", label: "Reject" },
        ]}
      />
      {decision === "approve" && renderApprove
        ? renderApprove(fieldErrors)
        : null}
      {decision === "reject" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-template`}>Reason</Label>
            <NativeSelect
              id={`${id}-template`}
              defaultValue=""
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="">Choose a reason, or write your own</option>
              {reasons.map((text) => (
                <option key={text} value={text}>
                  {text}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-reason`}>Message to the worker</Label>
            <Textarea
              id={`${id}-reason`}
              name="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={fieldErrors?.reason ? true : undefined}
              aria-describedby={`${id}-reason-hint`}
            />
            <p
              id={`${id}-reason-hint`}
              className="text-sm text-muted-foreground"
            >
              {fieldErrors?.reason?.[0] ??
                "We text this to the worker and show it in the app."}
            </p>
          </div>
        </div>
      ) : null}
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton pending={pending} disabled={!decision}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
