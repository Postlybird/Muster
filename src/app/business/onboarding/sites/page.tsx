import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getAllSettings } from "@/server/settings";

import { SiteForm, emptySite } from "../../sites/site-form";
import { ContinueBusinessForm } from "../continue-form";
import { BusinessStepFrame, loadBusinessStep } from "../frame";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesStepPage() {
  const { business } = await loadBusinessStep("sites");
  if (!business) return null;
  const supabase = await createClient();
  const [{ data: sites }, settings] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address_line1, suburb, postcode")
      .eq("business_id", business.id)
      .is("archived_at", null)
      .order("created_at"),
    getAllSettings(),
  ]);

  return (
    <BusinessStepFrame
      step="sites"
      completed={business.onboarding_steps}
      title="Sites"
      description="Where workers will go. Add your main site now; you can add more any time."
    >
      <div className="max-w-xl space-y-8">
        {(sites ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(sites ?? []).map((site) => (
              <li
                key={site.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <span>
                  <span className="block font-medium">{site.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {site.address_line1}, {site.suburb} {site.postcode}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <section aria-labelledby="add-site" className="space-y-4">
          <h2 id="add-site" className="text-lg font-semibold">
            {(sites ?? []).length > 0 ? "Add another site" : "Add a site"}
          </h2>
          <SiteForm
            key={(sites ?? []).length}
            values={emptySite}
            context="onboarding"
            defaultRadiusM={settings.geofence_radius_m}
          />
        </section>
        <ContinueBusinessForm step="sites" />
      </div>
    </BusinessStepFrame>
  );
}
