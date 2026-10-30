import { CalendarDays, MapPin, ShieldAlert, Wallet } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { JOB_TYPES } from "@/domain/jobs";
import { ratingSummary } from "@/domain/ratings";
import { zoneOf } from "@/lib/format";
import { shiftSummary } from "@/lib/job-format";
import {
  distanceLabel,
  hazardsLabel,
  payLabel,
  type JobOffer,
} from "@/lib/offers";

/** A job offered to a worker, in the shift feed and on their home screen. */
export function OfferCard({ offer }: { offer: JobOffer }) {
  const { first } = offer;
  const distance = distanceLabel(first.distance_km);
  return (
    <Link
      href={`/worker/shifts/${offer.jobId}`}
      className="block space-y-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{first.category_name}</p>
          <p className="text-sm text-muted-foreground">
            {first.business_name}
            {first.business_rating !== null
              ? ` · ${ratingSummary(Number(first.business_rating), first.business_rating_count)}`
              : ""}
          </p>
        </div>
        {first.job_type === "urgent" ? (
          <Badge variant="warning">{JOB_TYPES.urgent.label}</Badge>
        ) : null}
      </div>
      <p className="flex items-start gap-2 text-sm">
        <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
        {shiftSummary(offer.shifts, zoneOf(first.state))}
      </p>
      <p className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {first.suburb}
        {distance ? `, ${distance}` : ""}
      </p>
      <p className="flex items-start gap-2 text-sm font-medium">
        <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
        {payLabel(offer)}
      </p>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {hazardsLabel(first)}
      </p>
    </Link>
  );
}
