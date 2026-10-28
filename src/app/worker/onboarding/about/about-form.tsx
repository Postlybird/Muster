"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { DateParts } from "@/components/forms/date-parts";
import { FileUpload, type ExistingFile } from "@/components/forms/file-upload";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

import { StepActions } from "../step-actions";
import { saveAbout } from "./actions";

export type AboutValues = {
  legalFirstName: string;
  legalLastName: string;
  preferredName: string;
  dateOfBirth: string | null;
};

export function AboutForm({
  mode,
  workerId,
  values,
  locked,
  photo,
  photoRejection,
  minAge,
}: {
  mode: "wizard" | "edit";
  workerId: string;
  values: AboutValues;
  locked: boolean;
  photo: ExistingFile | null;
  photoRejection: string | null;
  minAge: number;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveAbout);
  const [uploading, setUploading] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      {locked ? (
        <Alert variant="info">
          <AlertDescription>
            We&apos;ve checked your ID, so your legal name and date of birth are
            locked. Contact us if they need correcting.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="legal_first_name"
          label="First name"
          hint="As it appears on your ID."
          error={errors?.legal_first_name}
        >
          {(props) => (
            <Input
              {...props}
              name="legal_first_name"
              defaultValue={values.legalFirstName}
              autoComplete="given-name"
              disabled={locked}
            />
          )}
        </FormField>
        <FormField
          id="legal_last_name"
          label="Last name"
          hint="As it appears on your ID."
          error={errors?.legal_last_name}
        >
          {(props) => (
            <Input
              {...props}
              name="legal_last_name"
              defaultValue={values.legalLastName}
              autoComplete="family-name"
              disabled={locked}
            />
          )}
        </FormField>
      </div>

      <FormField
        id="preferred_name"
        label="Preferred name (optional)"
        hint="What you like to be called on site, if it's different."
        error={errors?.preferred_name}
      >
        {(props) => (
          <Input
            {...props}
            name="preferred_name"
            defaultValue={values.preferredName}
            autoComplete="nickname"
          />
        )}
      </FormField>

      <DateParts
        id="date_of_birth"
        name="date_of_birth"
        legend="Date of birth"
        hint={`For example 27 3 1995. You need to be ${minAge} or older.`}
        defaultValue={values.dateOfBirth}
        error={errors?.date_of_birth}
        disabled={locked}
        autoCompletePrefix="bday"
      />

      {photoRejection ? (
        <Alert variant="destructive">
          <AlertDescription className="text-foreground">
            Please change your photo: {photoRejection}
          </AlertDescription>
        </Alert>
      ) : null}
      <FileUpload
        id="photo"
        name="photo_path"
        label="A photo of your face"
        hint="Supervisors use it to know who's arriving. Face the camera in good light, with no sunglasses or hat."
        error={errors?.photo_path}
        bucket="worker-photos"
        folder={workerId}
        prefix="photo"
        accept="image"
        maxDimension={1200}
        existing={photo}
        onBusyChange={setUploading}
      />

      <ActionFeedback state={state} />
      <StepActions
        mode={mode}
        step="about"
        pending={pending}
        disabled={uploading}
      />
    </form>
  );
}
