import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  FILL_MODES_FOR_WORKERS,
  JOB_TYPES,
  PPE_SUPPLIERS_FOR_WORKERS,
} from "@/domain/jobs";
import { formatCents, formatDayShort } from "@/lib/format";
import { shiftHours } from "@/lib/job-format";
import { distanceLabel, groupOffers } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker } from "@/server/workers";

export const metadata: Metadata = { title: "Shift details" };

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-2 rounded-xl border bg-card p-4"
    >
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A list, or a fallback sentence when it's empty. */
function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Notes({ label, text }: { label: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line">
      <span className="font-medium">{label}:</span> {text}
    </p>
  );
}

/**
 * A job offered to the worker: everything they need to decide (brief §4.4).
 * The address and who to report to appear once they're booked.
 */
export default async function ShiftOfferPage({
  params,
}: PageProps<"/worker/shifts/[id]">) {
  const { id } = await params;
  const { worker } = await getMyWorker();
  if (worker.status !== "active") notFound();
  const supabase = await createClient();
  const [{ data: shifts }, { data: details }] = await Promise.all([
    supabase.rpc("my_shift_offers", { p_job_id: id }),
    supabase.rpc("my_job_offer", { p_job_id: id }).maybeSingle(),
  ]);
  const [offer] = groupOffers(shifts ?? []);
  if (!offer || !details) notFound();
  const { first } = offer;
  const distance = distanceLabel(first.distance_km, "from home");
  const urgent = first.job_type === "urgent";

  return (
    <div className="space-y-4">
      <Link
        href="/worker/shifts"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All shifts
      </Link>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {first.category_name}
          </h1>
          {urgent ? (
            <Badge variant="warning">{JOB_TYPES.urgent.label}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">for {first.business_name}</p>
      </div>

      <Section
        id="when"
        title={
          offer.shifts.length === 1 ? "When" : `${offer.shifts.length} shifts`
        }
      >
        <ul className="divide-y text-sm">
          {offer.shifts.map((shift) => (
            <li
              key={shift.shift_id}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
            >
              <span>
                <span className="font-medium">
                  {formatDayShort(shift.starts_at)}
                </span>
                , {shiftHours(shift)}
                {shift.break_minutes
                  ? ` (${shift.break_minutes}-minute unpaid break)`
                  : ""}
              </span>
              {shift.estimate_cents !== null ? (
                <span className="text-muted-foreground">
                  about {formatCents(shift.estimate_cents)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="where" title="Where">
        <p className="flex items-center gap-1">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {first.suburb}
          {distance ? `, ${distance}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;ll see the full address and who to report to once you&apos;re
          booked.
        </p>
      </Section>

      <Section id="pay" title="Pay">
        <p>
          {first.hourly_cents
            ? `${formatCents(first.hourly_cents)} an hour, casual loading included.`
            : "Pay to be confirmed."}
        </p>
        <p className="text-sm text-muted-foreground">
          The amounts above include weekend, night and overtime rates where they
          apply
          {urgent ? ", and the urgent call-out loading" : ""}. They&apos;re
          before tax.
        </p>
      </Section>

      <Section id="safety" title="Safety">
        {first.no_known_hazards ? (
          <p className="text-sm">The business knows of no hazards on site.</p>
        ) : (
          <List items={first.hazards} empty="No hazards listed." />
        )}
        <Notes label="Controls in place" text={details.hazard_controls} />
        <Notes label="More about the hazards" text={details.hazard_notes} />
        <Notes label="Induction" text={details.induction} />
      </Section>

      <Section id="ppe" title="PPE">
        <List items={first.ppe} empty="No PPE listed." />
        {first.ppe.length > 0 ? (
          <p className="text-sm">
            {PPE_SUPPLIERS_FOR_WORKERS[first.ppe_supplied_by]}
          </p>
        ) : null}
        <Notes label="Notes" text={details.ppe_notes} />
      </Section>

      <Section id="needs" title="What you need">
        <List
          items={[
            ...first.tickets,
            ...(first.police_check_required ? ["A current police check"] : []),
          ]}
          empty="No tickets needed."
        />
        <Notes label="Instructions" text={details.instructions} />
      </Section>

      <Alert variant="info">
        <AlertDescription>
          {FILL_MODES_FOR_WORKERS[details.fill_mode]} Applying opens in the next
          update.
        </AlertDescription>
      </Alert>
    </div>
  );
}
