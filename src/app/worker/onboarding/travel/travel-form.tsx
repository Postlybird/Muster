"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { ChoiceField, YES_NO, yesNo } from "@/components/forms/choice-field";
import { FormField } from "@/components/forms/form-field";
import { PlacePicker } from "@/components/forms/place-picker";
import { useServerForm } from "@/components/forms/use-server-form";
import { NativeSelect } from "@/components/ui/native-select";

import { StepActions } from "../step-actions";
import { saveTravel } from "./actions";
import {
  LICENCE_LABELS,
  RADIUS_OPTIONS_KM,
  type LicenceClass,
} from "@/config/worker-options";

export type TravelValues = {
  suburbLabel: string;
  radiusKm: number;
  hasCar: boolean | null;
  licenceClass: LicenceClass | null;
  usesPublicTransport: boolean | null;
};

export function TravelForm({
  mode,
  values,
}: {
  mode: "wizard" | "edit";
  values: TravelValues;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveTravel);
  const radiusOptions = RADIUS_OPTIONS_KM.includes(values.radiusKm)
    ? RADIUS_OPTIONS_KM
    : [...RADIUS_OPTIONS_KM, values.radiusKm].sort((a, b) => a - b);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-6">
      <FormField
        id="home_place"
        label="Your suburb"
        hint="We use it to find work near you. We never show it to businesses."
        error={errors?.home_place}
      >
        {(props) => (
          <PlacePicker
            {...props}
            name="home_place"
            kind="suburb"
            defaultLabel={values.suburbLabel}
            placeholder="Start typing your suburb or postcode"
          />
        )}
      </FormField>

      <FormField
        id="travel_radius_km"
        label="How far will you travel?"
        hint="Straight-line distance from your suburb. You can change it any time."
        error={errors?.travel_radius_km}
      >
        {(props) => (
          <NativeSelect
            {...props}
            name="travel_radius_km"
            defaultValue={String(values.radiusKm)}
            className="sm:w-60"
          >
            {radiusOptions.map((km) => (
              <option key={km} value={km}>
                Up to {km} km
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>

      <ChoiceField
        id="has_car"
        name="has_car"
        legend="Do you have a car to get to work?"
        choices={YES_NO}
        defaultValue={yesNo(values.hasCar)}
        error={errors?.has_car}
      />

      <FormField
        id="licence_class"
        label="Driver licence"
        hint="Some jobs need you to drive a work vehicle."
        error={errors?.licence_class}
      >
        {(props) => (
          <NativeSelect
            {...props}
            name="licence_class"
            defaultValue={values.licenceClass ?? ""}
            className="sm:w-80"
          >
            <option value="" disabled>
              Choose one
            </option>
            {Object.entries(LICENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>

      <ChoiceField
        id="uses_public_transport"
        name="uses_public_transport"
        legend="Can you get to work by public transport?"
        choices={YES_NO}
        defaultValue={yesNo(values.usesPublicTransport)}
        error={errors?.uses_public_transport}
      />

      <ActionFeedback state={state} />
      <StepActions mode={mode} step="travel" pending={pending} />
    </form>
  );
}
