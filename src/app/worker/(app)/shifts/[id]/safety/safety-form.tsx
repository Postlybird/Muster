"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FileUpload } from "@/components/forms/file-upload";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Textarea } from "@/components/ui/textarea";

import { reportSafetyIssue } from "../actions";

export function SafetyForm({
  jobId,
  assignmentId,
  workerId,
}: {
  jobId: string;
  assignmentId: string;
  workerId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    reportSafetyIssue.bind(null, jobId, assignmentId),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        id="description"
        label="What's wrong?"
        hint="What you saw, where on site, and whether anyone's been hurt."
        error={fieldErrors?.description}
      >
        {(props) => (
          <Textarea {...props} name="description" rows={5} maxLength={2000} />
        )}
      </FormField>
      <FileUpload
        id="photo"
        name="photo"
        label="A photo (optional)"
        error={fieldErrors?.photo}
        bucket="safety-photos"
        folder={workerId}
        prefix="safety"
        accept="image"
        capture="environment"
        onBusyChange={setUploading}
      />
      <ActionFeedback state={state} />
      <SubmitButton
        pending={pending}
        pendingText="Sending…"
        disabled={uploading}
        size="lg"
        className="w-full sm:w-auto"
      >
        Send to our team
      </SubmitButton>
    </form>
  );
}
