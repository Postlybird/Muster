"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FileUpload } from "@/components/forms/file-upload";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StepActions } from "../step-actions";
import { saveRightToWork } from "./actions";
import {
  BASIS_DESCRIPTIONS,
  BASIS_LABELS,
  EVIDENCE_LABELS,
  type Basis,
  type Evidence,
} from "@/config/worker-options";

export type RightToWorkValues = {
  basis: Basis | null;
  evidence: Evidence | null;
  evidencePath: string | null;
  passportNumber: string;
  passportCountry: string;
  visaGrantNumber: string;
  visaSubclass: string;
};

export function RightToWorkForm({
  mode,
  workerId,
  values,
}: {
  mode: "wizard" | "edit";
  workerId: string;
  values: RightToWorkValues;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveRightToWork);
  const [basis, setBasis] = useState<string>(values.basis ?? "");
  const [uploading, setUploading] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      <ChoiceField
        id="basis"
        name="basis"
        legend="Which applies to you?"
        columns={1}
        value={basis}
        onValueChange={setBasis}
        error={errors?.basis}
        choices={Object.entries(BASIS_LABELS).map(([value, label]) => ({
          value,
          label,
          description: BASIS_DESCRIPTIONS[value as Basis],
        }))}
      />

      {basis === "citizen" ? (
        <div className="space-y-6">
          <ChoiceField
            id="citizenship_evidence"
            name="citizenship_evidence"
            legend="What can you show us?"
            hint="VEVO can't confirm citizenship, so we check one of these instead."
            columns={1}
            defaultValue={values.evidence ?? undefined}
            error={errors?.citizenship_evidence}
            choices={Object.entries(EVIDENCE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <FileUpload
            id="evidence"
            name="evidence_path"
            label="Photo or scan of the document"
            hint="The page with your photo and details. We delete it once we've checked it."
            error={errors?.evidence_path}
            bucket="identity"
            folder={workerId}
            prefix="citizenship"
            accept="document"
            maxDimension={2000}
            existing={
              values.evidencePath ? { path: values.evidencePath } : null
            }
            onBusyChange={setUploading}
          />
        </div>
      ) : basis ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="passport_number"
              label="Passport number"
              error={errors?.passport_number}
            >
              {(props) => (
                <Input
                  {...props}
                  name="passport_number"
                  defaultValue={values.passportNumber}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              )}
            </FormField>
            <FormField
              id="passport_country"
              label="Country of passport"
              error={errors?.passport_country}
            >
              {(props) => (
                <Input
                  {...props}
                  name="passport_country"
                  defaultValue={
                    values.passportCountry ||
                    (basis === "nz_citizen" ? "New Zealand" : "")
                  }
                  autoComplete="country-name"
                />
              )}
            </FormField>
          </div>
          {basis !== "nz_citizen" ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                id="visa_grant_number"
                label="Visa grant number (if you have it)"
                hint="On your visa grant letter or in ImmiAccount."
                error={errors?.visa_grant_number}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="visa_grant_number"
                    defaultValue={values.visaGrantNumber}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                )}
              </FormField>
              <FormField
                id="visa_subclass"
                label="Visa subclass (if you know it)"
                hint="For example 500."
                error={errors?.visa_subclass}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="visa_subclass"
                    defaultValue={values.visaSubclass}
                    autoComplete="off"
                  />
                )}
              </FormField>
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id="vevo_consent"
                name="vevo_consent"
                className="mt-0.5"
                aria-invalid={errors?.vevo_consent ? true : undefined}
                aria-describedby={
                  errors?.vevo_consent ? "vevo_consent-error" : undefined
                }
              />
              <Label
                htmlFor="vevo_consent"
                className="leading-snug font-normal"
              >
                I agree to you checking my visa details with the Department of
                Home Affairs (VEVO), now and again before my visa ends.
              </Label>
            </div>
            {errors?.vevo_consent ? (
              <p id="vevo_consent-error" className="text-sm text-destructive">
                {errors.vevo_consent[0]}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ActionFeedback state={state} />
      <StepActions
        mode={mode}
        step="right-to-work"
        pending={pending}
        disabled={uploading}
      />
    </form>
  );
}
