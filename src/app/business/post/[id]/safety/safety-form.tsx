"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { PPE_SUPPLIERS } from "@/domain/jobs";

import { saveSafety } from "./actions";

export type SafetyValues = {
  hazardIds: string[];
  noKnownHazards: boolean;
  hazardNotes: string;
  hazardControls: string;
  induction: string;
  ppeIds: string[];
  ppeSuppliedBy: string;
  ppeNotes: string;
};

type Item = { id: string; name: string; description: string };

export function SafetyForm({
  jobId,
  values,
  hazards,
  ppe,
}: {
  jobId: string;
  values: SafetyValues;
  hazards: Item[];
  ppe: Item[];
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveSafety.bind(null, jobId));
  const [ticked, setTicked] = useState(values.hazardIds);
  const [noneKnown, setNoneKnown] = useState(values.noKnownHazards);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-8">
      <fieldset
        className="space-y-3"
        aria-describedby={errors?.hazard_ids ? "hazards-error" : undefined}
      >
        <legend className="text-sm font-medium">Hazards on site</legend>
        <p className="text-sm text-muted-foreground">
          We carry safety duties for every worker we place, so tell us what
          they&apos;ll face. Workers see this before they accept.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {hazards.map((hazard) => (
            <div key={hazard.id} className="flex items-start gap-3">
              <Checkbox
                id={`hazard-${hazard.id}`}
                name="hazard_ids"
                value={hazard.id}
                checked={!noneKnown && ticked.includes(hazard.id)}
                disabled={noneKnown}
                onCheckedChange={(checked) =>
                  setTicked((current) =>
                    checked
                      ? [...current, hazard.id]
                      : current.filter((id) => id !== hazard.id),
                  )
                }
                className="mt-0.5"
              />
              <Label htmlFor={`hazard-${hazard.id}`} className="font-normal">
                {hazard.name}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id="no_known_hazards"
            name="no_known_hazards"
            checked={noneKnown}
            onCheckedChange={(checked) => setNoneKnown(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="no_known_hazards" className="font-normal">
            No known hazards
          </Label>
        </div>
        {errors?.hazard_ids ? (
          <p id="hazards-error" className="text-sm text-destructive">
            {errors.hazard_ids[0]}
          </p>
        ) : null}
      </fieldset>

      {!noneKnown && ticked.length > 0 ? (
        <>
          <FormField
            id="hazard_controls"
            label="Controls in place"
            hint="How each hazard is managed: testing, barriers, ventilation, equipment, supervision."
            error={errors?.hazard_controls}
          >
            {(props) => (
              <Textarea
                {...props}
                name="hazard_controls"
                rows={4}
                defaultValue={values.hazardControls}
              />
            )}
          </FormField>
          <FormField
            id="hazard_notes"
            label="Anything else about the hazards (optional)"
            error={errors?.hazard_notes}
          >
            {(props) => (
              <Textarea
                {...props}
                name="hazard_notes"
                rows={2}
                defaultValue={values.hazardNotes}
              />
            )}
          </FormField>
        </>
      ) : null}

      <FormField
        id="induction"
        label="Site induction (optional)"
        hint="When and where it happens, and who runs it."
        error={errors?.induction}
      >
        {(props) => (
          <Textarea
            {...props}
            name="induction"
            rows={2}
            defaultValue={values.induction}
          />
        )}
      </FormField>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">PPE needed</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ppe.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                id={`ppe-${item.id}`}
                name="ppe_ids"
                value={item.id}
                defaultChecked={values.ppeIds.includes(item.id)}
                className="mt-0.5"
              />
              <Label htmlFor={`ppe-${item.id}`} className="font-normal">
                {item.name}
              </Label>
            </div>
          ))}
        </div>
        {errors?.ppe_ids ? (
          <p className="text-sm text-destructive">{errors.ppe_ids[0]}</p>
        ) : null}
      </fieldset>

      <ChoiceField
        id="ppe_supplied_by"
        name="ppe_supplied_by"
        legend="Who supplies the PPE?"
        defaultValue={values.ppeSuppliedBy}
        error={errors?.ppe_supplied_by}
        columns={1}
        choices={Object.entries(PPE_SUPPLIERS).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <FormField
        id="ppe_notes"
        label="PPE notes (optional)"
        error={errors?.ppe_notes}
      >
        {(props) => (
          <Textarea
            {...props}
            name="ppe_notes"
            rows={2}
            defaultValue={values.ppeNotes}
          />
        )}
      </FormField>

      <ActionFeedback state={state} />
      <WizardActions
        pending={pending}
        backHref={`/business/post/${jobId}/needs`}
      />
    </form>
  );
}
