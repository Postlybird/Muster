"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { WorkerWordsField } from "@/components/forms/worker-words-field";

import { saveApplicationNote } from "./actions";

/** Change the note sent with an application, while the business chooses. */
export function ApplicationNoteForm({
  jobId,
  note,
}: {
  jobId: string;
  note: string | null;
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveApplicationNote.bind(null, jobId),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <WorkerWordsField
        id="application_note"
        name="note"
        label="Why you're a good fit"
        hint="Leave it empty to remove your note. No phone numbers, emails or links."
        defaultValue={note}
        error={fieldErrors?.note}
      />
      <ActionFeedback state={state} />
      <SubmitButton pending={pending} pendingText="Saving…" variant="outline">
        Save note
      </SubmitButton>
    </form>
  );
}
