"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { FAVOURITES_FIRST_OPTIONS, FILL_MODES } from "@/domain/jobs";

import { postJob } from "./actions";

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
}

export function ReviewForm({
  jobId,
  fillMode,
  favouritesFirst,
  urgent,
  canPost,
}: {
  jobId: string;
  fillMode: string;
  favouritesFirst: number | null;
  /** Urgent call-outs go to everyone at once, so there's no head start. */
  urgent: boolean;
  canPost: boolean;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(postJob.bind(null, jobId));
  const [saveTemplate, setSaveTemplate] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <ChoiceField
        id="fill_mode"
        name="fill_mode"
        legend="How should we fill it?"
        defaultValue={fillMode}
        error={errors?.fill_mode}
        columns={1}
        choices={Object.entries(FILL_MODES).map(([value, info]) => ({
          value,
          label: info.label,
          description: info.description,
        }))}
      />
      {urgent ? null : (
        <FormField
          id="favourites_first_minutes"
          label="Offer it to your favourite workers first?"
          hint="They get a head start before everyone else sees it."
          error={errors?.favourites_first_minutes}
        >
          {(props) => (
            <NativeSelect
              {...props}
              name="favourites_first_minutes"
              defaultValue={favouritesFirst ? String(favouritesFirst) : ""}
              className="sm:w-72"
            >
              <option value="">No, offer it to everyone now</option>
              {FAVOURITES_FIRST_OPTIONS.map((minutes) => (
                <option key={minutes} value={String(minutes)}>
                  Yes, for {minutesLabel(minutes)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="save_template"
            name="save_template"
            checked={saveTemplate}
            onCheckedChange={(checked) => setSaveTemplate(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="save_template" className="font-normal">
            Save as a template, to post this again in seconds
          </Label>
        </div>
        {saveTemplate ? (
          <FormField
            id="template_name"
            label="Template name"
            hint="Like 'Flood strip-out crew'."
            error={errors?.template_name}
          >
            {(props) => (
              <Input {...props} name="template_name" className="sm:w-80" />
            )}
          </FormField>
        ) : null}
      </div>
      <ActionFeedback state={state} />
      <WizardActions
        primaryLabel="Post work"
        pendingLabel="Posting…"
        pending={pending}
        disabled={!canPost}
        backHref={`/business/post/${jobId}/safety`}
      />
    </form>
  );
}
