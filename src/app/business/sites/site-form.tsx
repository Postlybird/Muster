"use client";

import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { PlacePicker } from "@/components/forms/place-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms";

import { saveSite } from "./actions";

export type SiteValues = {
  id: string | null;
  name: string;
  addressLabel: string;
  accessNotes: string;
  parkingNotes: string;
  reportToName: string;
  reportToPhone: string;
  geofenceRadiusM: string;
};

export const emptySite: SiteValues = {
  id: null,
  name: "",
  addressLabel: "",
  accessNotes: "",
  parkingNotes: "",
  reportToName: "",
  reportToPhone: "",
  geofenceRadiusM: "",
};

export function SiteForm({
  values,
  context,
  defaultRadiusM,
  submitLabel,
}: {
  values: SiteValues;
  context: "onboarding" | "page";
  defaultRadiusM: number;
  submitLabel?: string;
}) {
  // Toast as soon as the save returns: after adding a site during setup the
  // page gives this form a new key, so it starts again empty.
  const save = saveSite.bind(null, values.id, context);
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(async (prev: ActionState, formData: FormData) => {
    const result = await save(prev, formData);
    if (result.status === "success") toast.success(result.message);
    return result;
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <FormField
        id="site-name"
        label="Site name"
        hint="What your team calls it, like 'Parramatta depot'."
        error={errors?.name}
      >
        {(props) => <Input {...props} name="name" defaultValue={values.name} />}
      </FormField>
      <FormField
        id="site-address"
        label="Street address"
        hint="Workers see the suburb when they're offered work, and the full address once they're booked."
        error={errors?.address}
      >
        {(props) => (
          <PlacePicker
            {...props}
            name="address"
            kind="address"
            defaultLabel={values.addressLabel}
            placeholder="Start typing the street address"
          />
        )}
      </FormField>
      <FormField
        id="site-access"
        label="Access instructions (optional)"
        hint="Where to go, who to ask for, any induction."
        error={errors?.access_notes}
      >
        {(props) => (
          <Textarea
            {...props}
            name="access_notes"
            rows={2}
            defaultValue={values.accessNotes}
          />
        )}
      </FormField>
      <FormField
        id="site-parking"
        label="Parking (optional)"
        error={errors?.parking_notes}
      >
        {(props) => (
          <Textarea
            {...props}
            name="parking_notes"
            rows={2}
            defaultValue={values.parkingNotes}
          />
        )}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="site-report-name"
          label="Report to (optional)"
          hint="Who workers ask for on arrival."
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
          id="site-report-phone"
          label="Their phone (optional)"
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
      <FormField
        id="site-geofence"
        label="Clock-in distance in metres (optional)"
        hint={`How close workers must be to clock in. Leave blank for the standard ${defaultRadiusM} m.`}
        error={errors?.geofence_radius_m}
      >
        {(props) => (
          <Input
            {...props}
            name="geofence_radius_m"
            inputMode="numeric"
            defaultValue={values.geofenceRadiusM}
            className="w-40"
          />
        )}
      </FormField>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton
        pending={pending}
        variant={context === "onboarding" ? "outline" : "default"}
      >
        {submitLabel ?? (values.id ? "Save site" : "Add site")}
      </SubmitButton>
    </form>
  );
}
