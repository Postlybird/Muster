import { CalendarDays, Lock, MapPin, Search, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { zoneOf } from "@/lib/format";
import { shiftSummary } from "@/lib/job-format";
import {
  distanceLabel,
  groupOffers,
  payLabel,
  type ShiftPreview,
} from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";

/**
 * Shifts near a worker we haven't checked yet (owner, 01/11/2026): the
 * work, where roughly and the pay, to show what's waiting. They can't apply
 * until we've checked them, so these aren't links.
 */
export async function PreviewList({
  limit,
  headingLevel = "h2",
}: {
  limit?: number;
  headingLevel?: "h2" | "h3";
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_shift_offers");
  const previews = groupOffers(
    (data ?? []).map((row): ShiftPreview => ({
      ...row,
      distance_km: row.distance_km === null ? null : Number(row.distance_km),
    })),
  );
  const shown = limit ? previews.slice(0, limit) : previews;
  const Heading = headingLevel;

  return (
    <section aria-labelledby="near-you" className="space-y-3">
      <div className="space-y-1">
        <Heading id="near-you" className="text-lg font-semibold">
          Shifts near you
        </Heading>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          You can apply once we&apos;ve checked your details.
        </p>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing near you right now"
          description="New work in what you chose shows here as soon as it's posted."
        />
      ) : (
        <ul className="space-y-3" aria-label="Shifts near you">
          {shown.map((preview) => {
            const { first } = preview;
            const distance = distanceLabel(first.distance_km);
            return (
              <li
                key={preview.jobId}
                className="space-y-2 rounded-xl border bg-card p-4"
              >
                <p className="font-semibold">{first.category_name}</p>
                <p className="flex items-start gap-2 text-sm">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  {shiftSummary(preview.shifts, zoneOf(first.state))}
                </p>
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {first.suburb}
                  {distance ? `, ${distance}` : ""}
                </p>
                <p className="flex items-start gap-2 text-sm font-medium">
                  <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {payLabel(preview)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
