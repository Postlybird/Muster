"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FileUpload } from "@/components/forms/file-upload";
import { useServerForm } from "@/components/forms/use-server-form";

import { StepActions } from "../step-actions";
import { saveIdentity } from "./actions";

export function IdentityForm({
  mode,
  workerId,
  values,
}: {
  mode: "wizard" | "edit";
  workerId: string;
  values: {
    documentType: "driver_licence" | "passport" | null;
    documentPath: string | null;
    selfiePath: string | null;
  };
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveIdentity);
  const [busy, setBusy] = useState({ document: false, selfie: false });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      <ChoiceField
        id="document_type"
        name="document_type"
        legend="Which photo ID will you use?"
        defaultValue={values.documentType ?? undefined}
        error={errors?.document_type}
        choices={[
          { value: "driver_licence", label: "Driver licence" },
          { value: "passport", label: "Passport" },
        ]}
      />
      <FileUpload
        id="document"
        name="document_path"
        label="Photo of your ID"
        hint="The side with your photo. Get all four corners in, with no glare."
        error={errors?.document_path}
        bucket="identity"
        folder={workerId}
        prefix="id-document"
        accept="document"
        maxDimension={2000}
        existing={values.documentPath ? { path: values.documentPath } : null}
        onBusyChange={(document) => setBusy((b) => ({ ...b, document }))}
      />
      <FileUpload
        id="selfie"
        name="selfie_path"
        label="A selfie"
        hint="Take it now, facing the camera, so we can match you to your ID."
        error={errors?.selfie_path}
        bucket="identity"
        folder={workerId}
        prefix="selfie"
        accept="image"
        capture="user"
        maxDimension={1200}
        existing={values.selfiePath ? { path: values.selfiePath } : null}
        onBusyChange={(selfie) => setBusy((b) => ({ ...b, selfie }))}
      />
      <p className="text-sm text-muted-foreground">
        Only our team sees these photos, and we delete them once we&apos;ve
        checked your ID. We keep a note that it was checked.
      </p>

      <ActionFeedback state={state} />
      <StepActions
        mode={mode}
        step="identity"
        pending={pending}
        disabled={busy.document || busy.selfie}
      />
    </form>
  );
}
