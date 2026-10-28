import type { Metadata } from "next";

import { getAllSettings } from "@/server/settings";

import { loadStep, StepFrame } from "../step-frame";
import { suburbLabel } from "@/config/worker-options";
import { TravelForm } from "./travel-form";

export const metadata: Metadata = { title: "Getting to work" };

export default async function TravelPage() {
  const { worker, mode } = await loadStep();
  const settings = await getAllSettings();
  // New workers start from the admin-set default distance.
  const radiusKm = worker.home_suburb
    ? worker.travel_radius_km
    : settings.default_travel_radius_km;

  return (
    <StepFrame
      mode={mode}
      step="travel"
      completed={worker.onboarding_steps}
      title="Getting to work"
      description="Where you live and how you get around, so we only offer you work you can reach."
    >
      <TravelForm
        mode={mode}
        values={{
          suburbLabel: suburbLabel(
            worker.home_suburb,
            worker.home_state,
            worker.home_postcode,
          ),
          radiusKm,
          hasCar: worker.has_car,
          licenceClass: worker.licence_class,
          usesPublicTransport: worker.uses_public_transport,
        }}
      />
    </StepFrame>
  );
}
