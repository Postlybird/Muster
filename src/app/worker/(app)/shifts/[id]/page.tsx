import {
  ArrowLeft,
  CalendarPlus,
  MapPin,
  Navigation,
  SearchX,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ActionButton } from "@/components/forms/action-button";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shiftsLabel } from "@/domain/bookings";
import {
  FILL_MODES_FOR_WORKERS,
  JOB_TYPES,
  PPE_SUPPLIERS_FOR_WORKERS,
} from "@/domain/jobs";
import { formatCents, formatDayShort } from "@/lib/format";
import { shiftHours } from "@/lib/job-format";
import { distanceLabel } from "@/lib/offers";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import { withdrawApplications } from "./actions";
import { TakeShiftsForm } from "./take-shifts-form";

export const metadata: Metadata = { title: "Shift details" };

function Section({
  id,
  title,
  children,
  className = "bg-card",
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`space-y-2 rounded-xl border p-4 ${className}`}
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

type ShiftTimes = {
  shift_id: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  estimate_cents: number | null;
};

function shiftDetail(shift: ShiftTimes): string {
  const parts = [shiftHours(shift)];
  if (shift.break_minutes) parts.push(`${shift.break_minutes}-minute break`);
  if (shift.estimate_cents !== null) {
    parts.push(`about ${formatCents(shift.estimate_cents)}`);
  }
  return parts.join(" · ");
}

function ShiftList({ shifts }: { shifts: ShiftTimes[] }) {
  return (
    <ul className="divide-y text-sm">
      {shifts.map((shift) => (
        <li
          key={shift.shift_id}
          className="flex flex-wrap gap-x-2 py-2 first:pt-0 last:pb-0"
        >
          <span className="font-medium">{formatDayShort(shift.starts_at)}</span>
          <span className="text-muted-foreground">{shiftDetail(shift)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A job that's been filled or taken down, e.g. from an old text's link. */
function Gone() {
  return (
    <div className="space-y-6">
      <PageHeader title="This work isn't available" />
      <EmptyState
        icon={SearchX}
        title="It's been filled or taken down"
        description="Shifts you can still take are under Find shifts."
        action={
          <Button asChild variant="outline">
            <Link href="/worker/shifts">Find shifts</Link>
          </Button>
        }
      />
    </div>
  );
}

/**
 * One job, from the worker's side (brief §4.4): everything they need to
 * decide, and a way to apply or accept. Once they're booked, the address,
 * who to report to and the photos appear.
 */
export default async function WorkerJobPage({
  params,
}: PageProps<"/worker/shifts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: offers }, { data: mine }, { data: job }] = await Promise.all([
    supabase.rpc("my_shift_offers", { p_job_id: id }),
    supabase.rpc("my_shifts", { p_job_id: id }),
    supabase.rpc("my_job", { p_job_id: id }).maybeSingle(),
  ]);
  if (!job) return <Gone />;
  const open = offers ?? [];
  const booked = (mine ?? []).filter(
    (s) => s.assignment_status === "confirmed",
  );
  const applied = (mine ?? []).filter(
    (s) => s.application_status === "applied",
  );
  const declined = (mine ?? []).filter(
    (s) => s.application_status === "declined",
  );
  const hourly =
    open[0]?.hourly_cents ??
    booked[0]?.hourly_cents ??
    applied[0]?.hourly_cents ??
    null;
  const distance = distanceLabel(open[0]?.distance_km ?? null, "from home");
  const urgent = job.job_type === "urgent";
  const address = [
    job.address_line1,
    [job.suburb, job.state, job.postcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const photos = job.booked
    ? await Promise.all(
        job.photo_paths.map(async (path) => {
          const { data } = await supabase.storage
            .from("job-photos")
            .createSignedUrl(path, 600);
          return data?.signedUrl ?? null;
        }),
      )
    : [];

  return (
    <div className="space-y-4">
      <Link
        href={
          booked.length || applied.length
            ? "/worker/my-shifts"
            : "/worker/shifts"
        }
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {booked.length || applied.length ? "My shifts" : "All shifts"}
      </Link>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {job.category_name}
          </h1>
          {urgent ? (
            <Badge variant="warning">{JOB_TYPES.urgent.label}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">for {job.business_name}</p>
      </div>

      {booked.length > 0 ? (
        <Section
          id="booked"
          title={`You're booked on ${shiftsLabel(booked.length)}`}
          className="border-success/30 bg-success-soft"
        >
          <ShiftList shifts={booked} />
          <div className="space-y-1 border-t pt-3">
            <p className="flex items-start gap-1 font-medium [overflow-wrap:anywhere]">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {address}
            </p>
            {job.report_to_name ? (
              <p className="text-sm">
                Report to {job.report_to_name}
                {job.report_to_phone ? (
                  <>
                    {" "}
                    on{" "}
                    <a
                      href={`tel:${job.report_to_phone}`}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {formatAuPhone(job.report_to_phone)}
                    </a>
                  </>
                ) : null}
                .
              </p>
            ) : null}
            <Notes label="Getting in" text={job.access_notes} />
            <Notes label="Parking" text={job.parking_notes} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation aria-hidden />
                Directions
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/worker/shifts/${id}/calendar`} download>
                <CalendarPlus aria-hidden />
                Add to calendar
              </a>
            </Button>
          </div>
          {photos.some(Boolean) ? (
            <ul className="grid grid-cols-3 gap-2 pt-2">
              {photos.map((url, index) =>
                url ? (
                  <li key={url}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed links */}
                    <img
                      src={url}
                      alt={`Photo ${index + 1} of the work`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {applied.length > 0 ? (
        <Section
          id="applied"
          title={`Applied for ${shiftsLabel(applied.length)}`}
        >
          <ShiftList shifts={applied} />
          <p className="text-sm text-muted-foreground">
            Waiting for {job.business_name} to choose. We&apos;ll text you if
            you&apos;re picked.
          </p>
          <ActionButton
            variant="outline"
            action={withdrawApplications.bind(null, id)}
            pendingText="Withdrawing…"
          >
            Withdraw application
          </ActionButton>
        </Section>
      ) : null}

      {declined.length > 0 && open.length === 0 && booked.length === 0 ? (
        <Alert variant="info">
          <AlertDescription>
            {declined.length === 1
              ? "The shift you applied for has been filled."
              : `The ${declined.length} shifts you applied for have been filled.`}
          </AlertDescription>
        </Alert>
      ) : null}

      {open.length > 0 ? (
        <Section
          id="take"
          title={
            booked.length || applied.length
              ? "More shifts you can take"
              : job.fill_mode === "auto"
                ? "Take this work"
                : "Apply for this work"
          }
        >
          <p className="text-sm text-muted-foreground">
            {FILL_MODES_FOR_WORKERS[job.fill_mode]}
          </p>
          <TakeShiftsForm
            jobId={id}
            mode={job.fill_mode}
            shifts={open.map((shift) => ({
              id: shift.shift_id,
              day: formatDayShort(shift.starts_at),
              detail: shiftDetail(shift),
            }))}
          />
        </Section>
      ) : null}

      {job.booked ? null : (
        <Section id="where" title="Where">
          <p className="flex items-center gap-1">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {job.suburb}
            {distance ? `, ${distance}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll see the full address and who to report to once
            you&apos;re booked.
          </p>
        </Section>
      )}

      <Section id="pay" title="Pay">
        <p>
          {hourly
            ? `${formatCents(hourly)} an hour, casual loading included.`
            : "Pay to be confirmed."}
        </p>
        <p className="text-sm text-muted-foreground">
          The amounts for each shift include weekend, night and overtime rates
          where they apply{urgent ? ", and the urgent call-out loading" : ""}.
          They&apos;re before tax.
        </p>
      </Section>

      <Section id="safety" title="Safety">
        {job.no_known_hazards ? (
          <p className="text-sm">The business knows of no hazards on site.</p>
        ) : (
          <List items={job.hazards} empty="No hazards listed." />
        )}
        <Notes label="Controls in place" text={job.hazard_controls} />
        <Notes label="More about the hazards" text={job.hazard_notes} />
        <Notes label="Induction" text={job.induction} />
      </Section>

      <Section id="ppe" title="PPE">
        <List items={job.ppe} empty="No PPE listed." />
        {job.ppe.length > 0 ? (
          <p className="text-sm">
            {PPE_SUPPLIERS_FOR_WORKERS[job.ppe_supplied_by]}
          </p>
        ) : null}
        <Notes label="Notes" text={job.ppe_notes} />
      </Section>

      <Section id="needs" title="What you need">
        <List
          items={[
            ...job.tickets,
            ...(job.police_check_required ? ["A current police check"] : []),
          ]}
          empty="No tickets needed."
        />
        <Notes label="Instructions" text={job.instructions} />
      </Section>
    </div>
  );
}
