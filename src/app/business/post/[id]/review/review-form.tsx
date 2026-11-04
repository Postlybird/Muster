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
import { formatCents } from "@/lib/format";

import { postJob } from "./actions";

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
}

export function ReviewForm({
  jobId,
  fillMode: savedFillMode,
  favouritesFirst,
  urgent,
  canPost,
  allowOvertime,
  overtime,
  poNumber,
}: {
  jobId: string;
  fillMode: string;
  favouritesFirst: number | null;
  /** Urgent call-outs go to everyone at once, so there's no head start. */
  urgent: boolean;
  canPost: boolean;
  allowOvertime: boolean;
  /** The overtime charge an hour and the limits, once the job is priced. */
  overtime: {
    rateCents: number;
    dailyHours: number;
    weeklyHours: number;
  } | null;
  poNumber: string | null;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(postJob.bind(null, jobId));
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [fillMode, setFillMode] = useState(savedFillMode);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <ChoiceField
        id="fill_mode"
        name="fill_mode"
        legend="How should we fill it?"
        value={fillMode}
        onValueChange={setFillMode}
        error={errors?.fill_mode}
        columns={1}
        choices={Object.entries(FILL_MODES).map(([value, info]) => ({
          value,
          label: info.label,
          description: info.description,
        }))}
      />
      {fillMode === "auto" ? (
        <div className="flex items-start gap-3">
          <Checkbox
            id="allow_overtime"
            name="allow_overtime"
            defaultChecked={allowOvertime}
            className="mt-0.5"
          />
          <Label
            htmlFor="allow_overtime"
            className="flex-col items-start gap-1 font-normal"
          >
            <span className="font-medium">
              Let workers on overtime take this shift
            </span>
            <span className="text-sm text-muted-foreground">
              A worker&apos;s hours with us add up. If their other shifts would
              take this one past{" "}
              {overtime
                ? `${overtime.dailyHours} hours that day or ${overtime.weeklyHours} that week`
                : "the day's or week's limit"}
              , those hours are overtime
              {overtime
                ? `, charged at ${formatCents(overtime.rateCents)} an hour (excluding GST)`
                : ""}
              . Leave this unticked and those workers can&apos;t take it.
            </span>
          </Label>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          If a worker&apos;s other shifts with us would put this one into
          overtime, you&apos;ll see it on their application, with what it adds,
          before you book them.
        </p>
      )}
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
      <FormField
        id="po_number"
        label="PO or reference number (optional)"
        hint="If your accounts team needs one, it goes on this job's invoice lines. You can add it later too."
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
            hint="Like 'Saturday wedding crew'."
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
