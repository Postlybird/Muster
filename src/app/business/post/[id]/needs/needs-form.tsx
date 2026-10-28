"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FileUpload } from "@/components/forms/file-upload";
import { FormField } from "@/components/forms/form-field";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WizardActions } from "@/components/wizard/wizard-actions";
import { MAX_JOB_PHOTOS } from "@/domain/jobs";

import { saveNeeds } from "./actions";

export type NeedsValues = {
  credentialIds: string[];
  policeCheck: boolean;
  instructions: string;
  reportToName: string;
  reportToPhone: string;
};

export function NeedsForm({
  jobId,
  businessId,
  categoryName,
  categoryNeedsPoliceCheck,
  values,
  tickets,
  usualTicketIds,
  photos,
}: {
  jobId: string;
  businessId: string;
  categoryName: string;
  categoryNeedsPoliceCheck: boolean;
  values: NeedsValues;
  tickets: { id: string; name: string }[];
  usualTicketIds: string[];
  photos: { id: string; url: string | null }[];
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveNeeds.bind(null, jobId));
  const [uploading, setUploading] = useState(0);
  const onBusyChange = (busy: boolean) =>
    setUploading((count) => count + (busy ? 1 : -1));
  const freeSlots = Math.max(0, MAX_JOB_PHOTOS - photos.length);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tickets workers need</legend>
        <p className="text-sm text-muted-foreground">
          We&apos;ve ticked the usual ones for {categoryName.toLowerCase()}.
          Only workers with these tickets verified are offered the work.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-start gap-3">
              <Checkbox
                id={`ticket-${ticket.id}`}
                name="credential_ids"
                value={ticket.id}
                defaultChecked={values.credentialIds.includes(ticket.id)}
                className="mt-0.5"
              />
              <Label
                htmlFor={`ticket-${ticket.id}`}
                className="flex-col items-start gap-0.5 font-normal"
              >
                <span>{ticket.name}</span>
                {usualTicketIds.includes(ticket.id) ? (
                  <span className="text-xs text-muted-foreground">
                    Usual for this work
                  </span>
                ) : null}
              </Label>
            </div>
          ))}
        </div>
        {errors?.credential_ids ? (
          <p className="text-sm text-destructive">{errors.credential_ids[0]}</p>
        ) : null}
      </fieldset>

      <div className="flex items-start gap-3">
        <Checkbox
          id="police_check_required"
          name="police_check_required"
          defaultChecked={values.policeCheck || categoryNeedsPoliceCheck}
          disabled={categoryNeedsPoliceCheck}
          aria-describedby="police-check-hint"
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor="police_check_required">
            Workers need a police check
          </Label>
          <p id="police-check-hint" className="text-sm text-muted-foreground">
            {categoryNeedsPoliceCheck
              ? "Always needed for this type of work."
              : "For example, in people's homes or with vulnerable people."}
          </p>
        </div>
      </div>

      <FormField
        id="instructions"
        label="Instructions for workers (optional)"
        hint="What they'll be doing, what to bring, anything they should know. Workers see this before they accept."
        error={errors?.instructions}
      >
        {(props) => (
          <Textarea
            {...props}
            name="instructions"
            rows={4}
            defaultValue={values.instructions}
          />
        )}
      </FormField>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Photos (optional)</legend>
        <p className="text-sm text-muted-foreground">
          Up to {MAX_JOB_PHOTOS} photos of the site or the work, so workers know
          what to expect.
        </p>
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-4">
            {photos.map((photo, index) => (
              <li key={photo.id} className="space-y-2">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className="size-24 rounded-md object-cover"
                  />
                ) : null}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`remove-${photo.id}`}
                    name="remove_photo"
                    value={photo.id}
                  />
                  <Label htmlFor={`remove-${photo.id}`} className="font-normal">
                    Remove
                    <span className="sr-only"> photo {index + 1}</span>
                  </Label>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {Array.from({ length: freeSlots }, (_, slot) => (
          <FileUpload
            key={slot}
            id={`photo-${slot}`}
            name="photo"
            label={`Add a photo${freeSlots > 1 ? ` (${slot + 1} of ${freeSlots})` : ""}`}
            bucket="job-photos"
            folder={businessId}
            prefix="job"
            error={slot === 0 ? errors?.photo : undefined}
            onBusyChange={onBusyChange}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Who workers report to</legend>
        <p className="text-sm text-muted-foreground">
          Booked workers see this name and number.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="report_to_name"
            label="Name"
            error={errors?.report_to_name}
          >
            {(props) => (
              <Input
                {...props}
                name="report_to_name"
                defaultValue={values.reportToName}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField
            id="report_to_phone"
            label="Phone"
            error={errors?.report_to_phone}
          >
            {(props) => (
              <Input
                {...props}
                name="report_to_phone"
                type="tel"
                defaultValue={values.reportToPhone}
                autoComplete="off"
              />
            )}
          </FormField>
        </div>
      </fieldset>

      <ActionFeedback state={state} />
      <WizardActions
        pending={pending}
        disabled={uploading > 0}
        backHref={`/business/post/${jobId}/when`}
      />
    </form>
  );
}
